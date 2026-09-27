import { describe, expect, it } from 'vitest';
import { CORPUS_TUNE_FIGURES } from './autoTuneFigures.ts';
import type { CorpusSheetName } from './sheetCorpus.ts';
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
  TUNE_ROUNDS,
  TUNE_TRIM_STRENGTHS,
} from '../src/constants/autoTune.ts';
import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
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
} from '../src/constants/quantiser.ts';
import type { TunedDials } from '../src/types/autoTune.ts';
import type { QuantiseSettings } from '../src/types/quantiser.ts';
import { TUNE_STAGES } from '../src/utils/tuneStages.ts';
import { tunedDialsOf } from '../src/utils/tuneStage.ts';

/**
 * The cost arithmetic `constants/autoTune.ts` opens with, and the sums and comparisons it draws from
 * the table in `autoTuneFigures.ts`. No sweep runs here: the rows are pinned by the other
 * `auto-tune-figures-*` suites, and this holds what the docblock says *about* them.
 */

/** A position on every branch, so no stage skips: an ink-blending reading, a budget, the pass on. */
const SETTINGS: QuantiseSettings = {
  ...QUANTISE_DEFAULT_DIALS,
  grid: 6,
  key: null,
  reduction: { kind: 'MAX_COLORS', maxColors: 64 },
  antiAlias: 'BOTH',
  vote: 'INK_WEIGHTED',
  fillCleanup: 24,
};

/** Each numeric dial's ladder against the range its slider offers. A two-state dial is swept whole. */
const LADDERS: Partial<
  Record<keyof TunedDials, { ladder: readonly number[]; range: { min: number; max: number; step: number } }>
> = {
  outlineExpansion: { ladder: TUNE_OUTLINE_EXPANSIONS, range: OUTLINE_EXPANSION_RANGE },
  lineStrength: { ladder: TUNE_LINE_STRENGTHS, range: LINE_STRENGTH_RANGE },
  trimStrength: { ladder: TUNE_TRIM_STRENGTHS, range: TRIM_STRENGTH_RANGE },
  inkThreshold: { ladder: TUNE_INK_THRESHOLDS, range: INK_THRESHOLD_RANGE },
  colorMerge: { ladder: TUNE_COLOR_MERGES, range: COLOR_MERGE_RANGE },
  fillCleanup: { ladder: TUNE_FILL_CLEANUPS, range: FILL_CLEANUP_RANGE },
  cleanupPasses: { ladder: TUNE_CLEANUP_PASSES, range: CLEANUP_PASSES_RANGE },
  antiAliasThreshold: { ladder: TUNE_ALIAS_THRESHOLDS, range: ANTI_ALIAS_THRESHOLD_RANGE },
  antiAliasRun: { ladder: TUNE_ALIAS_RUNS, range: ANTI_ALIAS_RUN_RANGE },
  antiAliasStrength: { ladder: TUNE_ALIAS_STRENGTHS, range: ANTI_ALIAS_STRENGTH_RANGE },
};

/** Whether a reader can set some dial of the stage to a position its ladder does not hold. */
function carriesOffLadder(dials: readonly (keyof TunedDials)[]): boolean {
  return dials.some((dial) => {
    const entry = LADDERS[dial];
    if (entry === undefined) return false;
    const { min, max, step } = entry.range;
    const count = Math.round((max - min) / step) + 1;
    return Array.from({ length: count }, (_, at) => Number((min + at * step).toFixed(6))).some(
      (position) => !entry.ladder.includes(position),
    );
  });
}

const STAGES = TUNE_STAGES.map((stage) => {
  const plan = stage.plan(tunedDialsOf(SETTINGS), SETTINGS);
  if ('skipped' in plan) throw new Error(`${stage.name} skipped on the branch that skips nothing`);
  return {
    cell: !stage.name.startsWith('ALIAS'),
    positions: plan.candidates.length,
    off: carriesOffLadder(stage.dials),
  };
});

const ROWS = Object.entries(CORPUS_TUNE_FIGURES) as [
  CorpusSheetName,
  (typeof CORPUS_TUNE_FIGURES)[CorpusSheetName],
][];
const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);

describe('constants/autoTune.ts — the cost of a sweep', () => {
  it('ranks 145 positions a round on the branch that skips nothing, 107 of them the cell-and-colour stages', () => {
    expect(STAGES.map((stage) => stage.positions)).toEqual([15, 49, 11, 15, 13, 4, 10, 8, 20]);
    expect(sum(STAGES.map((stage) => stage.positions))).toBe(145);
  });

  it('bounds a sweep at 1176 positions, 1232 off every ladder, and 872 and 904 with the pass off', () => {
    const cells = STAGES.filter((stage) => stage.cell);
    const bound = (stages: typeof STAGES) =>
      TUNE_ROUNDS * sum(stages.map((stage) => stage.positions)) + 15 + 1;
    const offLadder = (stages: typeof STAGES) => TUNE_ROUNDS * stages.filter((stage) => stage.off).length;
    expect([bound(STAGES), bound(STAGES) + offLadder(STAGES)]).toEqual([1176, 1232]);
    expect([bound(cells), bound(cells) + offLadder(cells)]).toEqual([872, 904]);
  });

  it('ranks 1,121 positions over the corpus and runs 685, settling each between 26 and 135 colours', () => {
    const unkeyed = ROWS.map(([, row]) => row.unkeyed);
    expect(sum(unkeyed.map((row) => row.positions))).toBe(1121);
    expect(sum(unkeyed.map((row) => row.runs))).toBe(685);
    expect([
      Math.min(...unkeyed.map((row) => row.colors)),
      Math.max(...unkeyed.map((row) => row.colors)),
    ]).toEqual([26, 135]);
    // Every sheet settles on the reading the guidance warns about, unkeyed.
    expect(new Set(unkeyed.map((row) => row.vote))).toEqual(new Set(['K_CENTROID']));
    // Eight rounds is twice the worst of the eight.
    expect(Math.max(...unkeyed.map((row) => row.rounds)) * 2).toBe(TUNE_ROUNDS);
  });

  it('settles three sheets keyed where it settles them unkeyed, and moves the other five as the docblock says', () => {
    const dialsOf = ({ vote, colorMerge, fillCleanup, cleanupPasses }: (typeof ROWS)[number][1]['keyed']) =>
      JSON.stringify([vote, colorMerge, fillCleanup, cleanupPasses]);
    const unmoved = ROWS.filter(([, row]) => dialsOf(row.keyed) === dialsOf(row.unkeyed)).map(
      ([name]) => name,
    );
    expect(unmoved.sort()).toEqual(['armour.png', 'character_space_marine_blue.png', 'cyborg_healer.png']);

    const rungs = (merge: number) => TUNE_COLOR_MERGES.indexOf(merge as (typeof TUNE_COLOR_MERGES)[number]);
    const moved = ROWS.filter(([name]) => !unmoved.includes(name));
    for (const [, row] of moved) {
      expect([1, 2]).toContain(Math.abs(rungs(row.keyed.colorMerge) - rungs(row.unkeyed.colorMerge)));
    }
    expect(ROWS.filter(([, row]) => row.keyed.vote !== 'K_CENTROID').map(([name]) => name)).toEqual([
      'vehicles_and_props.png',
    ]);

    const lengthened = ROWS.filter(([, row]) => row.keyed.positions !== row.unkeyed.positions);
    expect(
      Object.fromEntries(
        lengthened.map(([name, row]) => [name, [row.unkeyed.positions, row.keyed.positions]]),
      ),
    ).toEqual({
      'three-quarter-view_tiles1.png': [192, 145],
      'vehicles_and_props.png': [145, 102],
      'cyborg_monk.png': [102, 145],
      'ui_elements1.png': [102, 145],
    });
  });
});
