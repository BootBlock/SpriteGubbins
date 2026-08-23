import { describe, expect, it } from 'vitest';
import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';
import { TUNED_DIAL_KEYS } from '../types/autoTune.ts';
import type { TunedDials } from '../types/autoTune.ts';
import { ladder, sameTunedDials, tunedDialsOf, withIncumbent } from './tuneStage.ts';

const DIALS: TunedDials = tunedDialsOf(QUANTISE_DEFAULT_DIALS);

/** The same position with one dial moved, whatever kind of value that dial holds. */
function shift(dials: TunedDials, key: keyof TunedDials): TunedDials {
  if (key === 'vote') return { ...dials, vote: dials.vote === 'DOMINANT' ? 'K_CENTROID' : 'DOMINANT' };
  if (key === 'antiAliasPalette') {
    return { ...dials, antiAliasPalette: dials.antiAliasPalette === 'SNAP' ? 'BLEND' : 'SNAP' };
  }
  return { ...dials, [key]: dials[key] + 1 };
}

describe('tunedDialsOf', () => {
  it('answers with the swept dials and nothing else', () => {
    // The subset is the definition of what the sweep may move, so a dial that arrived here by a
    // spread of the whole tuning object would be a dial the stages could vary without anyone saying
    // so. See `TunedDials`, which argues each omission.
    expect(Object.keys(DIALS).sort()).toEqual([...TUNED_DIAL_KEYS].sort());
  });

  it('reads each one off the positions it was handed', () => {
    const moved = { ...QUANTISE_DEFAULT_DIALS, vote: 'K_CENTROID' as const, antiAliasStrength: 40 };

    expect(tunedDialsOf(moved)).toEqual({ ...DIALS, vote: 'K_CENTROID', antiAliasStrength: 40 });
  });
});

describe('ladder', () => {
  it('refuses a stage that has been given nothing to try', () => {
    // Choosing among nothing is not something a fallback can do, so the empty case throws rather
    // than answering with a position no ladder offered.
    expect(() => ladder([])).toThrow(/no positions/);
  });
});

describe('sameTunedDials', () => {
  it('compares every swept dial, so two positions differing in one are two positions', () => {
    // A dial missing from `TUNED_DIAL_KEYS` would fail nothing — it would quietly make two different
    // positions compare equal, and a stage that could not tell them apart would move a dial it was
    // promising to leave alone. This is what makes that walk observable.
    for (const key of TUNED_DIAL_KEYS) {
      expect(sameTunedDials(DIALS, shift(DIALS, key))).toBe(false);
    }
    expect(sameTunedDials(DIALS, { ...DIALS })).toBe(true);
  });
});

describe('withIncumbent', () => {
  it('puts the dials in force first, so a tie leaves every one of them alone', () => {
    // `chooseByElbow` settles a tie on the earliest candidate, and this is what makes that mean
    // "where the reader had it" rather than "wherever the ladder happens to start".
    const settled: TunedDials = { ...DIALS, inkThreshold: 63 };

    const tried = withIncumbent([{ ...DIALS, inkThreshold: 16 }], settled);

    expect(tried[0]).toEqual(settled);
    expect(tried).toHaveLength(2);
  });

  it('costs nothing where the ladder already holds it', () => {
    const settled: TunedDials = { ...DIALS, inkThreshold: 64 };
    const rungs = [{ ...DIALS, inkThreshold: 16 }, settled, { ...DIALS, inkThreshold: 96 }];

    const tried = withIncumbent(rungs, settled);

    expect(tried).toHaveLength(3);
    expect(tried[0]).toEqual(settled);
  });

  it('compares every swept dial, so two positions differing in one are two positions', () => {
    const settled: TunedDials = { ...DIALS, vote: 'INK_WEIGHTED' };

    for (const key of TUNED_DIAL_KEYS) {
      expect(withIncumbent([shift(settled, key)], settled)).toHaveLength(2);
    }
  });
});
