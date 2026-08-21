import {
  TUNE_CLEANUP_PASSES,
  TUNE_COLOR_MERGES,
  TUNE_FILL_CLEANUPS,
  TUNE_INK_THRESHOLDS,
  TUNE_LINE_STRENGTHS,
  TUNE_OUTLINE_EXPANSIONS,
  TUNE_TRIM_STRENGTHS,
} from '../constants/autoTune.ts';
import type { TuneStageName, TunedDials } from '../types/autoTune.ts';
import { VOTE_METHODS } from '../types/quantiser.ts';

/** A stage's positions to try, or the reason it has none. */
export type TuneStagePlan =
  { readonly candidates: readonly [TunedDials, ...TunedDials[]] } | { readonly skipped: string };

/** One step of the sweep: what it varies, and how to read back where it left things. */
export interface TuneStage {
  readonly name: TuneStageName;
  /** The positions to try from the dials settled so far, or why there are none. */
  plan(settled: TunedDials): TuneStagePlan;
  /** This stage's own dials as a phrase, for the report the panel shows. */
  describe(settled: TunedDials): string;
}

/**
 * The sweep, as a staged coordinate descent rather than one grid over every dial at once.
 *
 * **A full grid is not available at any resolution worth having.** Eight dials at five positions
 * each is 390,625 candidates, and each one runs the whole pipeline over three crops. Coordinate
 * descent is what makes the search affordable: each stage sweeps its own axes fully, from the dials
 * every earlier stage settled, so the cost is the *sum* of the stages rather than their product —
 * sixty positions at most, against a third of a million.
 *
 * **The order is the pipeline's own, and it is what makes the descent sound.** A coordinate descent
 * is only as good as the order it descends in, because a stage cannot revisit what an earlier one
 * chose. Here the earlier dial is always the one the later dial's effect *depends on*: which reading
 * turns the mesh into pixels decides what the ink blend has to work with, the ink blend decides what
 * colours exist for the merge to fold, and the merge decides what the cleanup finds to snap. Sweeping
 * the cleanup before the reading would tune a pass against colours the reading is about to replace.
 *
 * **Two stages can find themselves with nothing to do, and they say so rather than sweeping anyway.**
 * The ink dials are read only by `INK_WEIGHTED`, and the passes dial only where the fill cleanup is
 * on — so on a sheet whose reading settled elsewhere those candidates would be identical to one
 * another, and the elbow would be choosing between measurements of the same image.
 */
export const TUNE_STAGES: readonly TuneStage[] = [
  {
    name: 'READING',
    plan: (settled) => ({
      candidates: grid(
        VOTE_METHODS.flatMap((vote) =>
          TUNE_OUTLINE_EXPANSIONS.map((outlineExpansion) => ({ ...settled, vote, outlineExpansion })),
        ),
      ),
    }),
    describe: (settled) => `${settled.vote}, expansion ${String(settled.outlineExpansion)}`,
  },
  {
    name: 'INK_BLEND',
    plan: (settled) =>
      settled.vote !== 'INK_WEIGHTED'
        ? { skipped: INK_ONLY }
        : {
            candidates: grid(
              TUNE_LINE_STRENGTHS.flatMap((lineStrength) =>
                TUNE_TRIM_STRENGTHS.map((trimStrength) => ({ ...settled, lineStrength, trimStrength })),
              ),
            ),
          },
    describe: (settled) => `line ${settled.lineStrength.toFixed(1)}, trim ${settled.trimStrength.toFixed(1)}`,
  },
  {
    name: 'INK_THRESHOLD',
    plan: (settled) =>
      settled.vote !== 'INK_WEIGHTED'
        ? { skipped: INK_ONLY }
        : {
            candidates: grid(TUNE_INK_THRESHOLDS.map((inkThreshold) => ({ ...settled, inkThreshold }))),
          },
    describe: (settled) => `ink below ${String(settled.inkThreshold)}`,
  },
  {
    name: 'COLOUR_MERGE',
    plan: (settled) => ({
      candidates: grid(TUNE_COLOR_MERGES.map((colorMerge) => ({ ...settled, colorMerge }))),
    }),
    describe: (settled) => (settled.colorMerge === 0 ? 'merge off' : `merge ${String(settled.colorMerge)}`),
  },
  {
    name: 'FILL_CLEANUP',
    plan: (settled) => ({
      candidates: grid(TUNE_FILL_CLEANUPS.map((fillCleanup) => ({ ...settled, fillCleanup }))),
    }),
    describe: (settled) =>
      settled.fillCleanup === 0 ? 'cleanup off' : `cleanup ${String(settled.fillCleanup)}`,
  },
  {
    name: 'CLEANUP_PASSES',
    plan: (settled) =>
      settled.fillCleanup === 0
        ? { skipped: 'The fill cleanup settled at off, so a second pass has nothing to run over.' }
        : {
            candidates: grid(TUNE_CLEANUP_PASSES.map((cleanupPasses) => ({ ...settled, cleanupPasses }))),
          },
    describe: (settled) =>
      `${String(settled.cleanupPasses)} ${settled.cleanupPasses === 1 ? 'pass' : 'passes'}`,
  },
];

/** Said by both stages that only the ink-weighted reading gives anything to do. */
const INK_ONLY = 'This sheet settled on a reading that blends no ink, so these dials reach nothing.';

/**
 * A ladder's positions as the non-empty list {@link TuneStagePlan} promises.
 *
 * Every ladder in `constants/autoTune.ts` has entries, so the guard is what
 * `noUncheckedIndexedAccess` asks for rather than a case that arises — and throwing is the honest
 * answer to a stage that has been given an empty ladder, since choosing among nothing is not
 * something a fallback can do.
 */
function grid(candidates: readonly TunedDials[]): readonly [TunedDials, ...TunedDials[]] {
  const first = candidates[0];
  if (first === undefined) throw new Error('A sweep stage was given no positions to try');
  return [first, ...candidates.slice(1)];
}
