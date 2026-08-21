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
import { TUNE_STAGE_NAMES } from '../types/autoTune.ts';
import type { TunedDials } from '../types/autoTune.ts';
import { VOTE_METHODS } from '../types/quantiser.ts';
import { TUNE_STAGES } from './tuneStages.ts';

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

  it('costs at most sixty positions including the one the reader arrived with', () => {
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
      most += plan.candidates.length;
      settled = worst(plan.candidates, settled);
    }

    expect(most).toBe(60);
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

  it('opens each ladder at the position that turns its pass off, where it has one', () => {
    // What the tie-break rests on: a stage that cannot separate its candidates takes the first, and
    // the first has to be the answer a reader would have left in place.
    expect(TUNE_OUTLINE_EXPANSIONS[0]).toBe(0);
    expect(TUNE_TRIM_STRENGTHS[0]).toBe(0);
    expect(TUNE_COLOR_MERGES[0]).toBe(0);
    expect(TUNE_FILL_CLEANUPS[0]).toBe(0);
    expect(TUNE_CLEANUP_PASSES[0]).toBe(CLEANUP_PASSES_RANGE.min);
    expect(TUNE_LINE_STRENGTHS[0]).toBe(LINE_STRENGTH_RANGE.min);
  });
});
