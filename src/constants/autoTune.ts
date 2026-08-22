import type { TuneStageName } from '../types/autoTune.ts';

/**
 * The auto-tune sweep's fixed numbers — how much of the sheet it reads and which positions each
 * stage tries — and the paragraphs the panel shows about what it found.
 *
 * Its own file rather than more entries in `constants/quantiser.ts`, because these are read against
 * one another rather than against the dial ranges — how many crops times how many candidates is the
 * sweep's whole cost, and that is the figure a change here has to be judged by.
 *
 * **Every ladder below is a subset of the dial's own range, never a second opinion about it.** The
 * ranges in `constants/quantiser.ts` say what a reader may set; these say where the sweep looks. A
 * ladder that left the range would offer the reader a position their own slider refuses.
 *
 * **The sweep costs sixty-one positions from the dials as they open, and at most sixty-five.** One
 * for the position the reader arrived with, then 15 + 20 + 6 + 8 + 7 + 4 across the six stages —
 * fewer where a stage skips, which is 35 on the reference sheet, since a reading that blends no ink
 * takes the two ink stages with it. Every stage also ranks the positions already in force, which
 * costs nothing where its ladder already holds them and one candidate where a reader has moved a
 * dial off the ladder; four stages can be in that state at once. See `withIncumbent` for why the
 * incumbent is in the set at all.
 *
 * **Measured on the reference sheet** (`test_sprites/armour.png`, 1254², a grid of 6, no keying, no
 * colour budget, every dial at its opening position), driven in Edge: three crops of 240 px, 35
 * positions run — the ink stages skip, because the reading settles on `K_CENTROID` — and **7.8
 * seconds** from the press to the dials moving. That is the figure the guidance's "a few seconds"
 * is stated against, and the one a change to any ladder here has to be judged by.
 *
 * **The sweep chose `K_CENTROID` on that sheet where a reader would likely choose `INK_WEIGHTED`,
 * and that is the objective doing what it says rather than a defect.** A resampled sheet has soft
 * edges, and an average genuinely is closer to a soft edge than a hard one is — so a likeness score
 * prefers the reading that averages, on any sheet whose contours were softened on the way back from
 * the generator. `AUTO_TUNE_GUIDANCE.settled` says so to the reader, because the alternative is a
 * reader taking the answer as a verdict on artwork whose whole value is in its linework.
 */

/**
 * How many cells of the grid in force one proxy crop spans, along each edge.
 *
 * The sweep reads crops rather than the sheet because it runs the whole pipeline once per candidate,
 * and the sheet can be 16.8 million pixels. Forty cells is the smallest crop that still answers the
 * questions being asked of it: the mesh reader wants at least {@link FEWEST_SPACINGS} boundary
 * spacings before it will call a spacing a habit, the colour merge and the fill cleanup are
 * neighbourhood passes that need a neighbourhood, and forty cells gives every one of them several
 * times what it asks for. What it costs depends on the grid, since the crop is forty cells of
 * whichever one is in force: at the grid of 6 the reference sheet reads at, a crop is 240 px square,
 * which is a twenty-seventh of that 1254 px sheet — so all three together are just over a tenth of
 * it.
 */
export const PROXY_CROP_CELLS = 40;

/**
 * How many crops the sweep reads.
 *
 * Three rather than one, because a single window lands somewhere in particular — a face, a flat
 * field, a run of gutter — and dials chosen on it are chosen for that. Three rather than ten,
 * because the cost is linear in this and the crops are picked by busyness, so the fourth is already
 * quieter than the third. A sheet with fewer than three non-overlapping windows gives what it has.
 */
export const PROXY_CROP_COUNT = 3;

/**
 * How far apart two candidate crop windows may start, as a fraction of the window's own edge.
 *
 * Half, so a busy region cannot fall between two windows and be missed by both, while the count of
 * positions to score stays four to the sheet's area rather than one per pixel. Rounded down to a
 * whole number of cells wherever that is at least one cell, so every window starts on the lattice.
 */
export const PROXY_CROP_STRIDE = 0.5;

/** The outline-expansion widths the reading stage tries — the dial's whole range. */
export const TUNE_OUTLINE_EXPANSIONS = [0, 1, 2, 3, 4] as const;

/**
 * The line strengths the ink stage tries.
 *
 * From the plain proportional blend at 1 to the pull that blackens a panel at 3, in the half-steps
 * the dial's own reasoning is written in — `LINE_STRENGTH_RANGE` records 1.5, 2 and 2.5 as the
 * three positions measured on the reference sheet, and this is that ladder with its ends attached.
 * It stops short of the dial's ceiling of 4 because past roughly 3 a one-third contour slice is
 * already pure ink and further travel only reaches thinner slices, which is the same file's note.
 */
export const TUNE_LINE_STRENGTHS = [1, 1.5, 2, 2.5, 3] as const;

/**
 * The trim strengths the ink stage tries, across the dial's range in whole steps.
 *
 * Coarser than the line ladder because the dial is coarser in its effect: a bright rim is a smaller
 * share of a cell than a dark contour, so the difference between 1 and 1.5 here is far less than the
 * same step on the line side. `0` leads, and is where the dial opens.
 */
export const TUNE_TRIM_STRENGTHS = [0, 1, 2, 3] as const;

/**
 * The ink thresholds the ink stage tries, spanning `INK_THRESHOLD_RANGE` end to end.
 *
 * Six positions sixteen apart, which is the whole 16–96 range at the resolution the dial's own note
 * describes it in: restrict the pull to truly black strokes at the bottom, admit darker artwork's
 * outlines at the top. The spacing is chosen so `DEFAULT_INK_THRESHOLD` — 64, the darkest-quarter
 * anchor the dominant vote's rescue shares — is one of them, which keeps the commonest sweep from
 * carrying the dial's own position as an extra candidate beside the ladder.
 */
export const TUNE_INK_THRESHOLDS = [16, 32, 48, 64, 80, 96] as const;

/**
 * The colour-merge tolerances the sweep tries, across `COLOR_MERGE_RANGE`.
 *
 * `0` first, because the merge not running is a real answer and the elbow should be able to reach
 * it. Then sixes to 24 and eights above it: the dial is a perceptual distance, and a tolerance near
 * zero separates colours a reader can tell apart while one near the ceiling is folding everything
 * whatever it is set to — so the resolution is spent where the answer actually changes.
 */
export const TUNE_COLOR_MERGES = [0, 6, 12, 18, 24, 32, 40, 48] as const;

/** The fill-cleanup tolerances the sweep tries, across `FILL_CLEANUP_RANGE`, `0` first for the same reason. */
export const TUNE_FILL_CLEANUPS = [0, 8, 16, 24, 32, 40, 48] as const;

/** The cleanup-pass counts the sweep tries — the dial's whole range, which is four positions. */
export const TUNE_CLEANUP_PASSES = [1, 2, 3, 4] as const;

/**
 * What each stage of the sweep is called, where the reader can see it.
 *
 * A record keyed by the union rather than a name carried on the stage itself, so a stage added to
 * `TUNE_STAGE_NAMES` fails to compile until it has a label a reader can read. The identifiers are
 * the app's own vocabulary — `INK_WEIGHTED`, the fill cleanup — and these are the same names in the
 * words the panels beside this one already use for those dials.
 */
export const TUNE_STAGE_LABELS: Readonly<Record<TuneStageName, string>> = {
  READING: 'Cell reading and outline expansion',
  INK_BLEND: 'Line and trim strength',
  INK_THRESHOLD: 'Ink threshold',
  COLOUR_MERGE: 'Colour merge',
  FILL_CLEANUP: 'Fill cleanup',
  CLEANUP_PASSES: 'Cleanup passes',
};

/**
 * The paragraph under the Auto button, one per state the panel can be in.
 *
 * Beside the numbers the sweep is made of rather than in `constants/tooltips/`, for the reason the
 * duplicate panel's guidance sits beside its own constants: these describe *what the sweep found on
 * this sheet* rather than what a control does, and the sentence and the ladder it describes drift
 * apart the moment they are filed apart. The button's own card — what pressing it does, and what it
 * will not touch — is in `QUANTISE_ACTION_TOOLTIPS`, where every other action's is.
 */
export const AUTO_TUNE_GUIDANCE = {
  waiting:
    'A pixel scale has to be settled before the dials can be swept: every candidate is judged by re-drawing the result at that scale and comparing it with the artwork it came from, and there is nothing to compare against until the scale is known. Set a grid above, then come back.',
  idle: 'The dials on this tab open at positions that suit some sheets and not others, and nothing on screen says which kind of sheet you have. This runs the pipeline over three busy crops of it, at around sixty combinations of the dials that decide how a cell is read and how its colours settle, and moves them to whichever came closest to the artwork for the fewest colours.',
  running:
    'Running the pipeline over three crops of the sheet, once for each candidate. It takes a few seconds on a large sheet, and the preview beside it keeps working throughout — the sweep is on a thread of its own.',
  settled:
    'The dials named below have moved; every other dial on this tab is exactly where you left it. One undo puts them all back. The likeness figure is structural similarity against the crops, where 1 is the artwork reproduced exactly, and the colour figure is what the result spent to get there — the sweep chose the position where one more colour started buying least, so a higher figure was available and was not worth its cost. One bias is worth knowing before you accept the reading it chose: on a sheet whose edges came back softened, an average genuinely sits closer to a soft edge than a hard one does, so likeness leans toward K_CENTROID even where the artwork lives on its contours. If yours does, try INK_WEIGHTED against what the sweep picked and judge the two in the preview.',
  failed:
    'The sweep produced nothing this time. The dials are untouched, so nothing about the sheet on screen has changed, and pressing Auto again is safe.',
} as const;
