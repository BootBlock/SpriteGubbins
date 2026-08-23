import { describe, expect, it } from 'vitest';
import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';
import { TUNED_DIAL_KEYS } from '../types/autoTune.ts';
import type { TunedDials } from '../types/autoTune.ts';
import type { QuantiseSettings } from '../types/quantiser.ts';
import { TUNE_STAGES } from './tuneStages.ts';
import { ladder, restoreSkipped, sameTunedDials, tunedDialsOf, withIncumbent } from './tuneStage.ts';

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

describe('restoreSkipped', () => {
  it('puts a stage’s own dials back and leaves every other dial alone', () => {
    const opening = DIALS;
    const swept: TunedDials = {
      ...DIALS,
      vote: 'K_CENTROID',
      lineStrength: 2,
      trimStrength: 1.5,
      inkThreshold: 40,
      colorMerge: 24,
    };
    const stage = TUNE_STAGES.find((entry) => entry.name === 'INK_BLEND');
    expect(stage).toBeDefined();
    if (stage === undefined) return;

    const restored = restoreSkipped(swept, opening, stage);

    expect(restored.lineStrength).toBe(opening.lineStrength);
    expect(restored.trimStrength).toBe(opening.trimStrength);
    // Everything the stage does not name is exactly where the descent left it, the two union-typed
    // dials included — the switch inside is what stops a widened index signature from touching them.
    expect(restored.vote).toBe('K_CENTROID');
    expect(restored.inkThreshold).toBe(40);
    expect(restored.colorMerge).toBe(24);
  });

  it('names dials every stage really owns, and no stage owns another’s', () => {
    // The list is what the restore acts on, so a stage naming a dial it does not vary would hand
    // back a position somebody else chose. Read off each stage's own candidates rather than a second
    // hand-written list: whatever a plan changes is what it owns.
    const settings: QuantiseSettings = {
      ...QUANTISE_DEFAULT_DIALS,
      grid: 4,
      key: null,
      reduction: { kind: 'MAX_COLORS', maxColors: 16 },
      antiAlias: 'BOTH',
      vote: 'INK_WEIGHTED',
    };
    const from: TunedDials = { ...DIALS, vote: 'INK_WEIGHTED', fillCleanup: 16 };

    for (const stage of TUNE_STAGES) {
      const plan = stage.plan(from, settings);
      if (!('candidates' in plan)) continue;
      const varied = new Set(
        TUNED_DIAL_KEYS.filter((key) => plan.candidates.some((candidate) => candidate[key] !== from[key])),
      );
      for (const key of varied) expect(stage.dials).toContain(key);
      for (const key of stage.dials) expect(TUNED_DIAL_KEYS).toContain(key);
    }
  });

  it('gives every swept dial exactly one owner', () => {
    // Two stages owning one dial would have the second restore undo the first's answer; none owning
    // it would leave a dial the sweep can move and never hand back.
    const owners = TUNE_STAGES.flatMap((stage) => [...stage.dials]);

    expect([...owners].sort()).toEqual([...TUNED_DIAL_KEYS].sort());
  });
});
