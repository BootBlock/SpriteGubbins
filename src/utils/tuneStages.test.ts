import { describe, expect, it } from 'vitest';
import {
  TUNE_CLEANUP_PASSES,
  TUNE_COLOR_MERGES,
  TUNE_FILL_CLEANUPS,
  TUNE_INK_THRESHOLDS,
  TUNE_LINE_STRENGTHS,
  TUNE_OUTLINE_EXPANSIONS,
  TUNE_TRIM_STRENGTHS,
} from '../constants/autoTune.ts';
import {
  CLEANUP_PASSES_RANGE,
  COLOR_MERGE_RANGE,
  FILL_CLEANUP_RANGE,
  INK_THRESHOLD_RANGE,
  LINE_STRENGTH_RANGE,
  OUTLINE_EXPANSION_RANGE,
  TRIM_STRENGTH_RANGE,
} from '../constants/quantiser.ts';
import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';
import { TUNED_DIAL_KEYS, TUNE_STAGE_NAMES } from '../types/autoTune.ts';
import type { TunedDials } from '../types/autoTune.ts';
import { VOTE_METHODS } from '../types/quantiser.ts';
import { TUNE_STAGES, withIncumbent } from './tuneStages.ts';

const DIALS: TunedDials = {
  vote: QUANTISE_DEFAULT_DIALS.vote,
  outlineExpansion: QUANTISE_DEFAULT_DIALS.outlineExpansion,
  lineStrength: QUANTISE_DEFAULT_DIALS.lineStrength,
  trimStrength: QUANTISE_DEFAULT_DIALS.trimStrength,
  inkThreshold: QUANTISE_DEFAULT_DIALS.inkThreshold,
  colorMerge: QUANTISE_DEFAULT_DIALS.colorMerge,
  fillCleanup: QUANTISE_DEFAULT_DIALS.fillCleanup,
  cleanupPasses: QUANTISE_DEFAULT_DIALS.cleanupPasses,
};

const stageNamed = (name: string) => TUNE_STAGES.find((stage) => stage.name === name);

describe('TUNE_STAGES', () => {
  it('names every stage the report can carry, in the order they run', () => {
    expect(TUNE_STAGES.map((stage) => stage.name)).toEqual([...TUNE_STAGE_NAMES]);
  });

  it('sweeps the reading across every vote and every expansion', () => {
    const plan = stageNamed('READING')?.plan(DIALS);

    expect(plan && 'candidates' in plan ? plan.candidates.length : 0).toBe(
      VOTE_METHODS.length * TUNE_OUTLINE_EXPANSIONS.length,
    );
  });

  it('varies only its own dials, leaving the rest exactly where they were', () => {
    for (const stage of TUNE_STAGES) {
      const plan = stage.plan({ ...DIALS, vote: 'INK_WEIGHTED', fillCleanup: 16 });
      if (!('candidates' in plan)) continue;
      for (const candidate of plan.candidates) {
        // Whatever a stage changes, the eight fields it hands on are still the eight it was given.
        expect(Object.keys(candidate).sort()).toEqual(Object.keys(DIALS).sort());
      }
    }
  });

  it('leaves the two ink stages nothing to do under a reading that blends no ink', () => {
    for (const vote of ['DOMINANT', 'K_CENTROID'] as const) {
      for (const name of ['INK_BLEND', 'INK_THRESHOLD']) {
        const plan = stageNamed(name)?.plan({ ...DIALS, vote });
        expect(plan && 'skipped' in plan ? plan.skipped : null).toMatch(/blends no ink/);
      }
    }
  });

  it('sweeps the two ink stages under the ink-weighted reading', () => {
    const blend = stageNamed('INK_BLEND')?.plan({ ...DIALS, vote: 'INK_WEIGHTED' });
    const threshold = stageNamed('INK_THRESHOLD')?.plan({ ...DIALS, vote: 'INK_WEIGHTED' });

    expect(blend && 'candidates' in blend ? blend.candidates.length : 0).toBe(
      TUNE_LINE_STRENGTHS.length * TUNE_TRIM_STRENGTHS.length,
    );
    expect(threshold && 'candidates' in threshold ? threshold.candidates.length : 0).toBe(
      TUNE_INK_THRESHOLDS.length,
    );
  });

  it('leaves the passes stage nothing to do while the fill cleanup is off', () => {
    const off = stageNamed('CLEANUP_PASSES')?.plan({ ...DIALS, fillCleanup: 0 });
    const on = stageNamed('CLEANUP_PASSES')?.plan({ ...DIALS, fillCleanup: 24 });

    expect(off && 'skipped' in off ? off.skipped : null).toMatch(/nothing to run over/);
    expect(on && 'candidates' in on ? on.candidates.length : 0).toBe(TUNE_CLEANUP_PASSES.length);
  });

  it('costs sixty-one positions from the dials as they open, including the one they open at', () => {
    // The whole point of descending stage by stage rather than gridding every dial at once: the
    // cost is the sum of the stages, where a full grid over eight dials is a third of a million.
    // Walked down the branch that skips nothing: the ink-weighted reading, and a fill cleanup that
    // is on. Every other branch is cheaper, which is what makes this the ceiling.
    const worst = (candidates: readonly TunedDials[], settled: TunedDials): TunedDials =>
      candidates.reduce(
        (best, candidate) => (reach(candidate) > reach(best) ? candidate : best),
        candidates[0] ?? settled,
      );
    const reach = (dials: TunedDials) =>
      (dials.vote === 'INK_WEIGHTED' ? 1 : 0) + (dials.fillCleanup > 0 ? 1 : 0);

    let most = 1;
    let settled: TunedDials = DIALS;
    for (const stage of TUNE_STAGES) {
      const plan = stage.plan(settled);
      if (!('candidates' in plan)) continue;
      const tried = withIncumbent(plan.candidates, settled);
      most += tried.length;
      settled = worst(tried, settled);
    }

    expect(most).toBe(61);
  });

  it('costs four more where the ladders have to carry the dials in force as well', () => {
    // A reader who has moved a dial off its ladder adds that position to the stage that sweeps it.
    // Four stages can be in that state at once, which is what puts the ceiling at sixty-five.
    const offLadder: TunedDials = {
      ...DIALS,
      vote: 'INK_WEIGHTED',
      lineStrength: 1.7,
      inkThreshold: 63,
      colorMerge: 7,
      fillCleanup: 9,
    };

    let most = 1;
    let settled = offLadder;
    for (const stage of TUNE_STAGES) {
      const plan = stage.plan(settled);
      if (!('candidates' in plan)) continue;
      const tried = withIncumbent(plan.candidates, settled);
      most += tried.length;
      settled = tried[0] ?? settled;
    }

    expect(most).toBe(65);
  });

  it('describes where each stage left its own dials', () => {
    expect(stageNamed('READING')?.describe({ ...DIALS, vote: 'INK_WEIGHTED', outlineExpansion: 2 })).toBe(
      'INK_WEIGHTED, expansion 2',
    );
    expect(stageNamed('COLOUR_MERGE')?.describe({ ...DIALS, colorMerge: 0 })).toBe('merge off');
    expect(stageNamed('FILL_CLEANUP')?.describe({ ...DIALS, fillCleanup: 0 })).toBe('cleanup off');
    expect(stageNamed('CLEANUP_PASSES')?.describe({ ...DIALS, cleanupPasses: 1 })).toBe('1 pass');
    expect(stageNamed('CLEANUP_PASSES')?.describe({ ...DIALS, cleanupPasses: 3 })).toBe('3 passes');
  });
});

describe('the ladders', () => {
  it('stays inside the range each dial’s own slider offers', () => {
    // A ladder that left the range would offer a position the reader's own control refuses.
    const within = (ladder: readonly number[], range: { min: number; max: number }) =>
      ladder.every((value) => value >= range.min && value <= range.max);

    expect(within(TUNE_OUTLINE_EXPANSIONS, OUTLINE_EXPANSION_RANGE)).toBe(true);
    expect(within(TUNE_LINE_STRENGTHS, LINE_STRENGTH_RANGE)).toBe(true);
    expect(within(TUNE_TRIM_STRENGTHS, TRIM_STRENGTH_RANGE)).toBe(true);
    expect(within(TUNE_INK_THRESHOLDS, INK_THRESHOLD_RANGE)).toBe(true);
    expect(within(TUNE_COLOR_MERGES, COLOR_MERGE_RANGE)).toBe(true);
    expect(within(TUNE_FILL_CLEANUPS, FILL_CLEANUP_RANGE)).toBe(true);
    expect(within(TUNE_CLEANUP_PASSES, CLEANUP_PASSES_RANGE)).toBe(true);
  });

  it('lands every position on a step the slider can actually reach', () => {
    const onStep = (ladder: readonly number[], range: { min: number; step: number }) =>
      ladder.every(
        (value) =>
          Math.abs(Math.round((value - range.min) / range.step) * range.step - (value - range.min)) < 1e-9,
      );

    expect(onStep(TUNE_OUTLINE_EXPANSIONS, OUTLINE_EXPANSION_RANGE)).toBe(true);
    expect(onStep(TUNE_LINE_STRENGTHS, LINE_STRENGTH_RANGE)).toBe(true);
    expect(onStep(TUNE_TRIM_STRENGTHS, TRIM_STRENGTH_RANGE)).toBe(true);
    expect(onStep(TUNE_INK_THRESHOLDS, INK_THRESHOLD_RANGE)).toBe(true);
    expect(onStep(TUNE_COLOR_MERGES, COLOR_MERGE_RANGE)).toBe(true);
    expect(onStep(TUNE_FILL_CLEANUPS, FILL_CLEANUP_RANGE)).toBe(true);
    expect(onStep(TUNE_CLEANUP_PASSES, CLEANUP_PASSES_RANGE)).toBe(true);
  });

  it('holds every dial’s opening position, so the commonest sweep carries no extra candidate', () => {
    // Not what the tie-break rests on — `withIncumbent` is — but what keeps it free: a ladder that
    // already contains the position a dial opens at needs no candidate added for it. This is the
    // assertion the ink threshold used to fail, at 64 against a ladder of 16, 36, 56, 76 and 96.
    expect(TUNE_OUTLINE_EXPANSIONS).toContain(QUANTISE_DEFAULT_DIALS.outlineExpansion);
    expect(TUNE_LINE_STRENGTHS).toContain(QUANTISE_DEFAULT_DIALS.lineStrength);
    expect(TUNE_TRIM_STRENGTHS).toContain(QUANTISE_DEFAULT_DIALS.trimStrength);
    expect(TUNE_INK_THRESHOLDS).toContain(QUANTISE_DEFAULT_DIALS.inkThreshold);
    expect(TUNE_COLOR_MERGES).toContain(QUANTISE_DEFAULT_DIALS.colorMerge);
    expect(TUNE_FILL_CLEANUPS).toContain(QUANTISE_DEFAULT_DIALS.fillCleanup);
    expect(TUNE_CLEANUP_PASSES).toContain(QUANTISE_DEFAULT_DIALS.cleanupPasses);
  });

  it('opens each ladder at the position that turns its pass off, where it has one', () => {
    expect(TUNE_OUTLINE_EXPANSIONS[0]).toBe(0);
    expect(TUNE_TRIM_STRENGTHS[0]).toBe(0);
    expect(TUNE_COLOR_MERGES[0]).toBe(0);
    expect(TUNE_FILL_CLEANUPS[0]).toBe(0);
    expect(TUNE_CLEANUP_PASSES[0]).toBe(CLEANUP_PASSES_RANGE.min);
    expect(TUNE_LINE_STRENGTHS[0]).toBe(LINE_STRENGTH_RANGE.min);
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
    const ladder = [{ ...DIALS, inkThreshold: 16 }, settled, { ...DIALS, inkThreshold: 96 }];

    const tried = withIncumbent(ladder, settled);

    expect(tried).toHaveLength(3);
    expect(tried[0]).toEqual(settled);
  });

  it('compares every swept dial, so two positions differing in one are two positions', () => {
    const settled: TunedDials = { ...DIALS, vote: 'INK_WEIGHTED' };

    for (const key of TUNED_DIAL_KEYS) {
      const differing = { ...settled, ...(key === 'vote' ? { vote: 'K_CENTROID' as const } : {}) };
      const shifted = key === 'vote' ? differing : { ...settled, [key]: settled[key] + 1 };
      expect(withIncumbent([shifted], settled)).toHaveLength(2);
    }
  });
});
