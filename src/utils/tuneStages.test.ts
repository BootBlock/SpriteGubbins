import { describe, expect, it } from 'vitest';
import {
  TUNE_ALIAS_RUNS,
  TUNE_ALIAS_STRENGTHS,
  TUNE_ALIAS_THRESHOLDS,
  TUNE_CLEANUP_PASSES,
  TUNE_COLOR_MERGES,
  TUNE_FILL_CLEANUPS,
  TUNE_INK_THRESHOLDS,
  TUNE_LINE_STRENGTHS,
  TUNE_OUTLINE_EXPANSIONS,
  TUNE_TRIM_STRENGTHS,
} from '../constants/autoTune.ts';
import {
  ANTI_ALIAS_RUN_RANGE,
  ANTI_ALIAS_STRENGTH_RANGE,
  ANTI_ALIAS_THRESHOLD_RANGE,
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
import type { QuantiseSettings } from '../types/quantiser.ts';
import { tunedDialsOf, withIncumbent } from './tuneStage.ts';
import { TUNE_STAGES } from './tuneStages.ts';

const DIALS: TunedDials = tunedDialsOf(QUANTISE_DEFAULT_DIALS);
const SETTINGS: QuantiseSettings = { ...QUANTISE_DEFAULT_DIALS, grid: 4, key: null, reduction: null };
/** The most expensive ask on offer: the pass pointed somewhere, and a palette for the snap to keep to. */
const SOFTENED: QuantiseSettings = {
  ...SETTINGS,
  antiAlias: 'BOTH',
  reduction: { kind: 'MAX_COLORS', maxColors: 16 },
};

/**
 * What one round of the descent costs from these dials, walking whichever branch is dearest.
 *
 * The rounds after the first cost the same as the first on the same branch, so the sweep's whole
 * figure is one of these times `TUNE_ROUNDS` plus the position the reader arrived with — which is
 * how `constants/autoTune.ts` states it.
 */
function roundCost(settings: QuantiseSettings, from: TunedDials, dearest: boolean): number {
  const reach = (dials: TunedDials) =>
    (dials.vote === 'INK_WEIGHTED' ? 1 : 0) + (dials.fillCleanup > 0 ? 1 : 0);
  let cost = 0;
  let settled = from;
  for (const stage of TUNE_STAGES) {
    const plan = stage.plan(settled, settings);
    if (!('candidates' in plan)) continue;
    const tried = withIncumbent(plan.candidates, settled);
    cost += tried.length;
    settled = dearest
      ? tried.reduce((best, candidate) => (reach(candidate) > reach(best) ? candidate : best))
      : (tried[0] ?? settled);
  }
  return cost;
}

describe('TUNE_STAGES', () => {
  it('names every stage the report can carry, in the order they run', () => {
    expect(TUNE_STAGES.map((stage) => stage.name)).toEqual([...TUNE_STAGE_NAMES]);
  });

  it('costs 145 positions a round on the branch that skips nothing', () => {
    // The whole point of descending stage by stage rather than gridding every dial at once: the cost
    // is the sum of the stages, where a full grid over twelve dials is a quarter of a billion.
    // Walked down the branch that skips nothing — the ink-weighted reading, a fill cleanup that is
    // on, the anti-aliasing pointed somewhere and a palette for its snap to keep to. Every other
    // branch is cheaper, which is what makes this the ceiling.
    expect(roundCost(SOFTENED, DIALS, true)).toBe(145);
  });

  it('costs 107 a round with the anti-aliasing control where the tab opens it', () => {
    // The three alias stages skip outright, which is the ordinary sweep rather than an exception:
    // `DEFAULT_ANTI_ALIAS` is `OFF` and the sweep may not move it.
    expect(roundCost(SETTINGS, DIALS, true)).toBe(107);
  });

  it('costs one more per stage where a reader has moved a dial off its ladder', () => {
    // Seven of the nine stages can carry the dials in force as an extra candidate; the reading and
    // the cleanup passes cannot, because their ladders are their dials' whole ranges.
    const offLadder: TunedDials = {
      ...DIALS,
      vote: 'INK_WEIGHTED',
      lineStrength: 1.7,
      inkThreshold: 63,
      colorMerge: 7,
      fillCleanup: 9,
      antiAliasThreshold: 23,
      antiAliasRun: 7,
      antiAliasStrength: 45,
    };

    expect(roundCost(SOFTENED, offLadder, false)).toBe(145 + 7);
  });
});

describe('the ladders', () => {
  const LADDERS: readonly (readonly [readonly number[], { min: number; max: number; step: number }])[] = [
    [TUNE_OUTLINE_EXPANSIONS, OUTLINE_EXPANSION_RANGE],
    [TUNE_LINE_STRENGTHS, LINE_STRENGTH_RANGE],
    [TUNE_TRIM_STRENGTHS, TRIM_STRENGTH_RANGE],
    [TUNE_INK_THRESHOLDS, INK_THRESHOLD_RANGE],
    [TUNE_COLOR_MERGES, COLOR_MERGE_RANGE],
    [TUNE_FILL_CLEANUPS, FILL_CLEANUP_RANGE],
    [TUNE_CLEANUP_PASSES, CLEANUP_PASSES_RANGE],
    [TUNE_ALIAS_THRESHOLDS, ANTI_ALIAS_THRESHOLD_RANGE],
    [TUNE_ALIAS_RUNS, ANTI_ALIAS_RUN_RANGE],
    [TUNE_ALIAS_STRENGTHS, ANTI_ALIAS_STRENGTH_RANGE],
  ];

  it('stays inside the range each dial’s own slider offers', () => {
    // A ladder that left the range would offer a position the reader's own control refuses.
    for (const [rungs, range] of LADDERS) {
      expect(rungs.every((value) => value >= range.min && value <= range.max)).toBe(true);
    }
  });

  it('lands every position on a step the slider can actually reach', () => {
    for (const [rungs, range] of LADDERS) {
      expect(
        rungs.every(
          (value) =>
            Math.abs(Math.round((value - range.min) / range.step) * range.step - (value - range.min)) < 1e-9,
        ),
      ).toBe(true);
    }
  });

  it('climbs, so no ladder states one position twice', () => {
    // Two rungs at one value is a candidate run twice and an elbow ranking a duplicate, both of
    // which are invisible in a report that only counts positions.
    for (const [rungs] of LADDERS) {
      expect(rungs.every((value, index) => index === 0 || value > (rungs[index - 1] ?? -Infinity))).toBe(
        true,
      );
    }
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
    expect(TUNE_ALIAS_THRESHOLDS).toContain(QUANTISE_DEFAULT_DIALS.antiAliasThreshold);
    expect(TUNE_ALIAS_RUNS).toContain(QUANTISE_DEFAULT_DIALS.antiAliasRun);
    expect(TUNE_ALIAS_STRENGTHS).toContain(QUANTISE_DEFAULT_DIALS.antiAliasStrength);
  });

  it('opens each ladder at the position that turns its pass off, where it has one', () => {
    expect(TUNE_OUTLINE_EXPANSIONS[0]).toBe(0);
    expect(TUNE_TRIM_STRENGTHS[0]).toBe(0);
    expect(TUNE_COLOR_MERGES[0]).toBe(0);
    expect(TUNE_FILL_CLEANUPS[0]).toBe(0);
    expect(TUNE_CLEANUP_PASSES[0]).toBe(CLEANUP_PASSES_RANGE.min);
    expect(TUNE_LINE_STRENGTHS[0]).toBe(LINE_STRENGTH_RANGE.min);
    // The three anti-aliasing dials have no off position of their own — the control's own `OFF` is
    // what stops the pass — so each opens at the floor of its range, which is the loosest reading.
    expect(TUNE_ALIAS_THRESHOLDS[0]).toBe(ANTI_ALIAS_THRESHOLD_RANGE.min);
    expect(TUNE_ALIAS_RUNS[0]).toBe(ANTI_ALIAS_RUN_RANGE.min);
    expect(TUNE_ALIAS_STRENGTHS[0]).toBe(ANTI_ALIAS_STRENGTH_RANGE.min);
  });
});
