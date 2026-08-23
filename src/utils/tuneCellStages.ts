import {
  TUNE_CLEANUP_PASSES,
  TUNE_COLOR_MERGES,
  TUNE_FILL_CLEANUPS,
  TUNE_INK_THRESHOLDS,
  TUNE_LINE_STRENGTHS,
  TUNE_OUTLINE_EXPANSIONS,
  TUNE_TRIM_STRENGTHS,
} from '../constants/autoTune.ts';
import { VOTE_METHODS } from '../types/quantiser.ts';
import { mergeIsExempt } from './quantiseImage.ts';
import { ladder, type TuneStage } from './tuneStage.ts';

/**
 * The six stages that decide how a cell is read and how its colours settle, in the pipeline's own
 * order.
 *
 * Everything here runs *ahead* of the segmentation and of the anti-aliasing pass, which is why they
 * are one group: each of the six changes what the next one has to work with. See `TUNE_STAGES` for
 * why the descent takes them in this order and `tuneAliasStages.ts` for the three that follow.
 *
 * **Four of the six can find themselves with nothing to do, and they say so rather than sweeping
 * anyway.** The two ink dials are read only by `INK_WEIGHTED`, the passes dial only where the fill
 * cleanup is on, and the merge does not run at all where the reader has *stated* which colours the
 * sheet is made of — so on a sheet in one of those states those candidates would be identical to one
 * another, and the elbow would be choosing between measurements of the same image. Each of the three
 * predicates is `quantiseImage`'s own gate rather than a second opinion about it, which is what lets
 * a stage that skips hand its dials back; see `restoreSkipped`. Only the reading and the fill
 * cleanup always run.
 */
export const TUNE_CELL_STAGES: readonly TuneStage[] = [
  {
    name: 'READING',
    dials: ['vote', 'outlineExpansion'],
    plan: (settled) => ({
      candidates: ladder(
        VOTE_METHODS.flatMap((vote) =>
          TUNE_OUTLINE_EXPANSIONS.map((outlineExpansion) => ({ ...settled, vote, outlineExpansion })),
        ),
      ),
    }),
    describe: (settled) => `${settled.vote}, expansion ${String(settled.outlineExpansion)}`,
  },
  {
    name: 'INK_BLEND',
    dials: ['lineStrength', 'trimStrength'],
    plan: (settled) =>
      settled.vote !== 'INK_WEIGHTED'
        ? { skipped: INK_ONLY }
        : {
            candidates: ladder(
              TUNE_LINE_STRENGTHS.flatMap((lineStrength) =>
                TUNE_TRIM_STRENGTHS.map((trimStrength) => ({ ...settled, lineStrength, trimStrength })),
              ),
            ),
          },
    describe: (settled) => `line ${settled.lineStrength.toFixed(1)}, trim ${settled.trimStrength.toFixed(1)}`,
  },
  {
    name: 'INK_THRESHOLD',
    dials: ['inkThreshold'],
    plan: (settled) =>
      settled.vote !== 'INK_WEIGHTED'
        ? { skipped: INK_ONLY }
        : {
            candidates: ladder(TUNE_INK_THRESHOLDS.map((inkThreshold) => ({ ...settled, inkThreshold }))),
          },
    describe: (settled) => `ink below ${String(settled.inkThreshold)}`,
  },
  {
    name: 'COLOUR_MERGE',
    dials: ['colorMerge'],
    plan: (settled, settings) =>
      mergeIsExempt(settings)
        ? { skipped: MERGE_EXEMPT }
        : { candidates: ladder(TUNE_COLOR_MERGES.map((colorMerge) => ({ ...settled, colorMerge }))) },
    describe: (settled) => (settled.colorMerge === 0 ? 'merge off' : `merge ${String(settled.colorMerge)}`),
  },
  {
    name: 'FILL_CLEANUP',
    dials: ['fillCleanup'],
    plan: (settled) => ({
      candidates: ladder(TUNE_FILL_CLEANUPS.map((fillCleanup) => ({ ...settled, fillCleanup }))),
    }),
    describe: (settled) =>
      settled.fillCleanup === 0 ? 'cleanup off' : `cleanup ${String(settled.fillCleanup)}`,
  },
  {
    name: 'CLEANUP_PASSES',
    dials: ['cleanupPasses'],
    plan: (settled) =>
      settled.fillCleanup === 0
        ? { skipped: 'The fill cleanup settled at off, so a second pass has nothing to run over.' }
        : {
            candidates: ladder(TUNE_CLEANUP_PASSES.map((cleanupPasses) => ({ ...settled, cleanupPasses }))),
          },
    describe: (settled) =>
      `${String(settled.cleanupPasses)} ${settled.cleanupPasses === 1 ? 'pass' : 'passes'}`,
  },
];

/** Said by both stages that only the ink-weighted reading gives anything to do. */
const INK_ONLY = 'This sheet settled on a reading that blends no ink, so these dials reach nothing.';

/** Said by the merge where the reader has stated which colours the sheet is made of. */
const MERGE_EXEMPT =
  'A pinned or locked palette states which colours this sheet is made of, so the merge is held back and this dial reaches nothing.';
