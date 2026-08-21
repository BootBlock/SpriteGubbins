import { describe, expect, it } from 'vitest';
import { DIAL_COALESCE_MS, DIAL_HISTORY_LIMIT } from '../constants/dialHistory.ts';
import { QUANTISE_DEFAULT_DIALS, QUANTISE_DIAL_KEYS } from '../constants/quantiseDials.ts';
import type { DialHistory, DialKey } from '../types/quantiseHistory.ts';
import type { QuantiseDials } from '../types/quantisePreset.ts';
import {
  canRedoDials,
  canUndoDials,
  currentDials,
  openHistory,
  recordDials,
  redoDials,
  sameDials,
  undoDepth,
  undoDials,
} from './dialHistory.ts';

/**
 * The undo stack's rules, which are the part of this feature that is easy to get subtly wrong.
 *
 * The coalescing window is why these are here rather than in the store's own suite: the difference
 * between a drag that is one step and a drag that is fifty is a comparison of two timestamps, and
 * stating the timestamps is the only way to test it that does not amount to driving a clock.
 */

const OPEN = openHistory(QUANTISE_DEFAULT_DIALS);

/** The defaults with one dial moved, which is what every edit below records. */
function moved(overrides: Partial<QuantiseDials>): QuantiseDials {
  return { ...QUANTISE_DEFAULT_DIALS, ...overrides };
}

describe('openHistory', () => {
  it('opens at the position it was given, with nowhere to step', () => {
    expect(currentDials(OPEN)).toEqual(QUANTISE_DEFAULT_DIALS);
    expect(canUndoDials(OPEN)).toBe(false);
    expect(canRedoDials(OPEN)).toBe(false);
    expect(undoDepth(OPEN)).toBe(0);
  });
});

describe('recordDials', () => {
  it('records a position that differs, and makes it the current one', () => {
    const history = recordDials(OPEN, moved({ colorMerge: 8 }), 'colorMerge', 0);

    expect(currentDials(history).colorMerge).toBe(8);
    expect(undoDepth(history)).toBe(1);
    expect(canUndoDials(history)).toBe(true);
  });

  it('records nothing for a change event that changed nothing', () => {
    // Re-choosing the reading a sheet is already read with. An entry for it would be an undo press
    // that visibly does nothing, which reads as a broken button rather than as a no-op.
    const history = recordDials(OPEN, { ...QUANTISE_DEFAULT_DIALS }, 'vote', 0);

    expect(history).toBe(OPEN);
  });

  it('extends the current step while one dial keeps moving', () => {
    // The drag. Fifty events, one step, and the step ends where the slider was let go.
    let history = OPEN;
    for (let value = 1; value <= 50; value += 1) {
      history = recordDials(history, moved({ fillCleanup: value }), 'fillCleanup', value * 10);
    }

    expect(undoDepth(history)).toBe(1);
    expect(currentDials(history).fillCleanup).toBe(50);
    expect(currentDials(undoDials(history))).toEqual(QUANTISE_DEFAULT_DIALS);
  });

  it('measures the window between events rather than across the gesture', () => {
    // A slow drag is still one gesture: each event lands inside the window of the one before it,
    // and the entry's own timestamp moves with it.
    let history = recordDials(OPEN, moved({ fillCleanup: 1 }), 'fillCleanup', 0);
    for (let step = 2; step <= 10; step += 1) {
      history = recordDials(
        history,
        moved({ fillCleanup: step }),
        'fillCleanup',
        (step - 1) * (DIAL_COALESCE_MS - 100),
      );
    }

    expect(undoDepth(history)).toBe(1);
    expect(currentDials(history).fillCleanup).toBe(10);
  });

  it('starts a step when the same dial is moved again after a pause', () => {
    const first = recordDials(OPEN, moved({ fillCleanup: 40 }), 'fillCleanup', 0);
    const second = recordDials(first, moved({ fillCleanup: 12 }), 'fillCleanup', DIAL_COALESCE_MS);

    expect(undoDepth(second)).toBe(2);
    expect(currentDials(undoDials(second)).fillCleanup).toBe(40);
  });

  it('starts a step when a different dial moves, however quickly', () => {
    const first = recordDials(OPEN, moved({ fillCleanup: 40 }), 'fillCleanup', 0);
    const second = recordDials(first, moved({ fillCleanup: 40, colorMerge: 8 }), 'colorMerge', 1);

    expect(undoDepth(second)).toBe(2);
  });

  it('never coalesces a whole-set write', () => {
    // A preset load. The position it replaced is exactly what a reader wants back after trying
    // somebody else's settings on their sheet, so it cannot be folded into the edit before it.
    const first = recordDials(OPEN, moved({ colorMerge: 8 }), 'colorMerge', 0);
    const loaded = recordDials(first, moved({ colorMerge: 8, fillCleanup: 30 }), null, 1);
    const again = recordDials(loaded, moved({ colorMerge: 8, fillCleanup: 12 }), null, 2);

    expect(undoDepth(again)).toBe(3);
  });

  it('drops the branch ahead of the cursor when a new edit lands', () => {
    const edited = recordDials(OPEN, moved({ colorMerge: 8 }), 'colorMerge', 0);
    const back = undoDials(edited);
    const branched = recordDials(back, moved({ cleanupPasses: 3 }), 'cleanupPasses', 5_000);

    expect(canRedoDials(branched)).toBe(false);
    expect(currentDials(branched)).toEqual(moved({ cleanupPasses: 3 }));
  });

  it('drops the oldest positions once the cap is reached, keeping the cursor on the newest', () => {
    const history = longHistory(DIAL_HISTORY_LIMIT + 10);

    expect(history.entries.length).toBe(DIAL_HISTORY_LIMIT);
    expect(undoDepth(history)).toBe(DIAL_HISTORY_LIMIT - 1);
    expect(currentDials(history).colorMerge).toBe(DIAL_HISTORY_LIMIT + 10);
  });

  it('will not fold an edit into the oldest position still kept', () => {
    // Once the cap has dropped the opening position off the front, entry zero is a real edit rather
    // than the defaults — and a reader who has stepped all the way back to it and moved that same
    // dial again would otherwise have nowhere left to step to at all.
    const back = walkBack(longHistory(DIAL_HISTORY_LIMIT + 5));
    const extended = recordDials(back, moved({ fillCleanup: 7 }), keyAt(back), 1);

    expect(canUndoDials(extended)).toBe(true);
  });
});

describe('undoDials and redoDials', () => {
  it('walk the positions in order and stop at each end', () => {
    const one = recordDials(OPEN, moved({ colorMerge: 8 }), 'colorMerge', 0);
    const two = recordDials(one, moved({ colorMerge: 8, cleanupPasses: 3 }), 'cleanupPasses', 5_000);

    const back = undoDials(undoDials(two));
    expect(currentDials(back)).toEqual(QUANTISE_DEFAULT_DIALS);
    expect(undoDials(back)).toBe(back);

    const forward = redoDials(redoDials(back));
    expect(currentDials(forward)).toEqual(moved({ colorMerge: 8, cleanupPasses: 3 }));
    expect(redoDials(forward)).toBe(forward);
  });
});

describe('sameDials', () => {
  it('sees a difference in every dial there is', () => {
    // Walked rather than sampled: a key missing from the list would not fail anything, it would
    // quietly make two different positions compare equal and lose that dial's undo step.
    for (const key of QUANTISE_DIAL_KEYS) {
      const value = QUANTISE_DEFAULT_DIALS[key];
      const other = typeof value === 'boolean' ? !value : typeof value === 'number' ? value + 1 : '';

      expect(sameDials(QUANTISE_DEFAULT_DIALS, { ...QUANTISE_DEFAULT_DIALS, [key]: other })).toBe(false);
    }
  });

  it('holds for a separate object carrying the same positions', () => {
    expect(sameDials(QUANTISE_DEFAULT_DIALS, { ...QUANTISE_DEFAULT_DIALS })).toBe(true);
  });
});

/**
 * A stack of however many separate steps, alternating two dials so nothing coalesces and spacing
 * them past the window so nothing extends.
 */
function longHistory(steps: number): DialHistory {
  let history = OPEN;
  for (let step = 1; step <= steps; step += 1) {
    history = recordDials(
      history,
      moved(step % 2 === 0 ? { colorMerge: step } : { fillCleanup: step }),
      step % 2 === 0 ? 'colorMerge' : 'fillCleanup',
      step * DIAL_COALESCE_MS,
    );
  }
  return history;
}

/** Every step back there is to take. */
function walkBack(history: DialHistory): DialHistory {
  let walked = history;
  while (canUndoDials(walked)) walked = undoDials(walked);
  return walked;
}

/** The dial that produced the current position, which an extending edit would have to match. */
function keyAt(history: DialHistory): DialKey {
  const entry = history.entries[history.index];
  if (entry === undefined || entry.key === null) throw new Error('expected a keyed position');
  return entry.key;
}
