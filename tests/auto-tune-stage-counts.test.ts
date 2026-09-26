import { describe, expect, it, vi } from 'vitest';

import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import { imageFrom } from '../src/test/images.ts';
import type { TuneReading, TunedDials } from '../src/types/autoTune.ts';
import type { QuantiseSettings } from '../src/types/quantiser.ts';
import { autoTune } from '../src/utils/autoTune.ts';

/**
 * What the auto-tune sweep reports and hands back for a stage that swept in one round and was skipped
 * in a later one.
 *
 * **The scorer is steered rather than real**, because the path under test is a property of the
 * descent's bookkeeping and not of any sheet. A real fixture reaches it only while the likeness score
 * happens to move the reading off `INK_WEIGHTED` in a later round, and a change to the score moves
 * that without touching the bookkeeping at all — which is how this claim lost its fixture once. Here
 * the reading that scores best depends on the colour merge alone: `INK_WEIGHTED` while the merge is
 * off and `DOMINANT` once it runs, and a merge of 12 outweighs either reading. A line strength of 4
 * earns a little more, and only under `INK_WEIGHTED`, which is the one reading that blends ink. So
 * the first round chooses `INK_WEIGHTED` and moves the line strength to 4, the colour merge moves to
 * 12, and the second round chooses `DOMINANT` and skips the ink blend. Every candidate spends the same
 * colours, so the price is nothing and each gain clears the margin on likeness alone.
 *
 * `vi.mock` is hoisted above every import in this file, which is why the steering is written inside
 * the factory rather than beside it, and why the record of what it read is `vi.hoisted`.
 */
const read = vi.hoisted(() => [] as TunedDials[]);

vi.mock('../src/utils/tuneCandidate.ts', () => ({
  readCandidate: (dials: TunedDials): TuneReading => {
    read.push(dials);
    const preferred = dials.colorMerge === 0 ? 'INK_WEIGHTED' : 'DOMINANT';
    const inked = dials.vote === 'INK_WEIGHTED' && dials.lineStrength === 4;
    return {
      fidelity:
        0.5 + (dials.colorMerge === 12 ? 0.3 : 0) + (dials.vote === preferred ? 0.1 : 0) + (inked ? 0.01 : 0),
      colors: 10,
    };
  },
}));

const GRID = 4;

/** Enough sheet for the sweep to cut a crop from; the steered scorer never looks at its pixels. */
const SHEET = imageFrom(40 * GRID, 40 * GRID, (x) =>
  x % 7 === 0 ? { r: 14, g: 12, b: 18, a: 255 } : { r: 60, g: 90, b: 150, a: 255 },
);

const SETTINGS: QuantiseSettings = { ...QUANTISE_DEFAULT_DIALS, grid: GRID, key: null, reduction: null };

describe('the auto-tune sweep’s count for a stage that ran and was later skipped', () => {
  it('reports the skip and what the stage spent before it', () => {
    const outcome = autoTune(SHEET, SETTINGS);
    const inkBlend = outcome.stages.find((stage) => stage.stage === 'INK_BLEND');

    // The steering did what the docblock says, or the claims below are about some other path.
    expect(outcome.dials.vote).toBe('DOMINANT');
    expect(outcome.dials.colorMerge).toBe(12);
    expect(outcome.rounds).toBeGreaterThanOrEqual(2);
    // It swept in an earlier round and is skipped in the last, so it reports a reason *and* what it
    // spent. Dropping the carry-forward would leave this at zero while the sweep's own total still
    // counted those positions.
    expect(inkBlend?.skipped).not.toBeNull();
    expect(inkBlend?.candidates).toBeGreaterThan(0);
    expect(outcome.candidates).toBe(
      1 + outcome.price.positions + outcome.stages.reduce((total, stage) => total + stage.candidates, 0),
    );
  });

  it('hands back the dials of the stage it set aside', () => {
    // The defect rounds introduced: the ink blend moved under a reading the sweep then abandoned, and
    // the panel renders the skip sentence rather than a count, so nothing on screen would say the
    // line strength had moved. It reaches no pixel under `DOMINANT`, and it goes back where it was.
    read.length = 0;
    const outcome = autoTune(SHEET, SETTINGS);

    // The descent did carry the moved line strength into the second round, whose reading stage read
    // `DOMINANT` with it — so the value below is a hand-back rather than a dial that never moved.
    expect(read.some((dials) => dials.vote === 'DOMINANT' && dials.lineStrength === 4)).toBe(true);
    expect(outcome.stages.find((stage) => stage.stage === 'INK_BLEND')?.skipped).toMatch(/blends no ink/);
    expect(outcome.dials.lineStrength).toBe(SETTINGS.lineStrength);
    expect(outcome.dials.trimStrength).toBe(SETTINGS.trimStrength);
  });
});
