import type { TuneStageName } from '../types/autoTune.ts';
import { ANTI_ALIAS_PALETTES } from '../types/quantiser.ts';

/**
 * The auto-tune sweep's fixed numbers — how much of the sheet it reads, how many times it goes
 * round, and which positions each stage tries — and the paragraphs the panel shows about what it
 * found.
 *
 * Its own file rather than more entries in `constants/quantiser.ts`, because these are read against
 * one another rather than against the dial ranges — how many crops times how many candidates times
 * how many rounds is the sweep's whole cost, and that is the figure a change here has to be judged
 * by.
 *
 * **Every ladder below is a subset of the dial's own range, never a second opinion about it.** The
 * ranges in `constants/quantiser.ts` say what a reader may set; these say where the sweep looks. A
 * ladder that left the range would offer the reader a position their own slider refuses.
 *
 * **The sweep is deliberately expensive, and that is the trade this feature is for.** It is pressed
 * once on a sheet, by a reader who would rather wait than accept dials chosen from a thinner search,
 * so every ladder here is stated at the resolution the answer changes at rather than at the coarsest
 * resolution that still finds something. **145 positions a round on the branch that skips nothing** —
 * 15 + 49 + 11 + 15 + 13 + 4 across the six cell-and-colour stages, then 10 + 8 + 20 across the three
 * anti-aliasing ones — which is **1161** across {@link TUNE_ROUNDS} rounds plus the position the
 * reader arrived with, and at most **1217** where a reader has moved a dial off every ladder that can
 * carry one. With the anti-aliasing control at its own `OFF`, which is where the tab opens, those
 * three stages skip and the two figures are **857** and **889**. Those are ceilings rather than
 * ordinary costs, because the descent stops as soon as a round retraces a position it has already
 * stood at: measured over the eight corpus sheets the real figures run from 134 to 403 positions, and
 * {@link TUNE_ROUNDS} carries that table. Every stage also ranks the positions
 * already in force, which costs nothing where its ladder already holds them; see `withIncumbent` for
 * why the incumbent is in the set at all.
 *
 * **Measured on the reference sheet** (`test_sprites/armour.png`, 1254², a grid of 6, no keying, no
 * colour budget, every dial at its opening position), by running `autoTune` over it directly: five
 * crops of 240 px and **403 positions over six rounds**, the three anti-aliasing stages skipping
 * because the tab opens that control off, ending at a likeness of **0.6554 for 112 colours** where
 * the opening position it started from scored 0.6264 for 960. A ninth of the colours for three
 * hundredths *more* likeness, which is the elbow finding a knee that is better on both counts than
 * where the reader began. It is also the sheet that costs the most rounds of the eight — the table
 * under {@link TUNE_ROUNDS} carries the rest.
 *
 * **What the widening bought, measured rather than assumed.** The narrower sweep this replaced — 35
 * positions, one round, three crops — settled this sheet on `DOMINANT` with the merge at 12 and the
 * cleanup at 48. Scored on the same five crops the widened sweep reads, that position is **0.6254 for
 * 54 colours** against the **0.6554 for 112** above: the two are a genuine trade rather than one
 * strictly beating the other, and it is a trade the narrow sweep could not offer at all, because
 * `K_CENTROID` at a line strength of 2 and an ink threshold of 56 is not a position any of its
 * ladders could reach in one round. Both figures are on the same sample, which is the only way the
 * pair means anything — the crop count moved with the ladders, so the *baselines* either side of this
 * change are not comparable and the answers are.
 *
 * **With the anti-aliasing pointed somewhere the sweep shapes it, and the shaping is real.** The same
 * sheet at `BOTH` costs 301 positions over four rounds and settles the pass at a contrast floor of 40
 * and a strength of **30%** — the dial turned down to under a third of the coverage the geometry
 * computes, which is pixel-art practice's one standing rule about anti-aliasing arrived at by
 * measurement. It reaches 0.6568 for 302 colours from a baseline of 0.6399 for 1058.
 *
 * **The count of positions is what a change to any ladder here has to be judged by**, not a wall
 * clock — the same code over the same sheet takes several times longer on one host than another, so
 * the guidance's "a minute or two" is stated against the position count rather than against any figure
 * a stopwatch produced.
 *
 * **The sweep chose the *cheapest* of the three readings on that sheet rather than the most faithful,
 * and that is the elbow doing what it says rather than a defect.** Of the fifteen positions the
 * reading stage tries, `INK_WEIGHTED` at expansion 0 reproduces the crops most closely at 0.6459 and
 * `K_CENTROID` at expansion 0 comes next at 0.6429, both spending 1208 colours; `DOMINANT` at
 * expansion 0 is the least faithful of the three at 0.6089 and spends 1030. The knee of that frontier
 * is `DOMINANT`, so a reader whose artwork lives on its linework has to ask for `INK_WEIGHTED`
 * themselves — which is what `AUTO_TUNE_GUIDANCE.settled` tells them to try. Those four figures are a
 * reading of the first stage alone at three crops, taken before the widening below; the reading
 * ladder is the one this change did not touch, so they still describe the positions it tries.
 *
 * **The averaging bias that guidance warns about is real on this sheet, and on the second sheet it
 * beats the reading the sweep goes on to choose.** A resampled sheet has soft edges, and an average
 * genuinely is closer to a soft edge than a hard one is — which is why both averaging readings
 * out-score `DOMINANT` on likeness above, on a sheet whose contours were softened on the way back
 * from the generator. On `test_sprites/cyborg_healer.png` (a grid of 4, and again a grid the run was
 * given rather than one the sheet reads at) `K_CENTROID` at expansion 0 beats the other averaging
 * reading on **both** counts — 0.6649 for 1416 colours against `INK_WEIGHTED`'s 0.6571 for 1435 — and
 * the elbow settles on `DOMINANT`, at 0.6478 for 1298, because it is cheaper than either. Those six
 * figures are a reading of the first stage **at three crops**, like the four above them; at five they
 * are 0.6638 for 1427, 0.6569 for 1445 and 0.6567 for 1321, which moves no part of the argument.
 * So on that sheet a reader who wants what the likeness column says is best has to ask for it, which
 * is the warning stated at its sharpest: the bias is a reason to check the reading, and the elbow is
 * a separate reason not to read the settled position as "the most faithful one".
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
 * whichever one is in force: at the grid of 6 these figures are stated under, a crop of the 1254 px
 * reference sheet is 240 px square, a twenty-seventh of it, so all five together are just under a
 * fifth. That is a worked example rather than a property of the sheet — what the readings *offer* for
 * it is 3 (`tests/sheet-scale-corpus.test.ts`), where the same crop is 120 px square.
 *
 * **The window is what did not grow when the search did.** Widening the ladders and rounding the
 * descent both buy a better answer *for the sample*; a larger window buys a better sample, and it
 * buys it at a cost quadratic in the edge where {@link PROXY_CROP_COUNT} buys it linearly. Five
 * windows of forty cells reads more of the sheet, and reads more *places* on it, than one window
 * spending the same pixels.
 */
export const PROXY_CROP_CELLS = 40;

/**
 * How many crops the sweep reads.
 *
 * Five rather than one, because a single window lands somewhere in particular — a face, a flat
 * field, a run of gutter — and dials chosen on it are chosen for that. The windows are picked by
 * busyness, so each one after the first is quieter than the one before it, and three is where that
 * argument used to stop — on a sweep that had to finish in seconds. It no longer does, and the fourth
 * and fifth windows are the cheapest generalisation on offer: the cost is linear in this figure,
 * where a wider ladder multiplies against every other ladder in its own stage.
 *
 * A sheet with fewer than five non-overlapping windows gives what it has.
 */
export const PROXY_CROP_COUNT = 5;

/**
 * How far apart two candidate crop windows may start, as a fraction of the window's own edge.
 *
 * Half, so a busy region cannot fall between two windows and be missed by both, while the count of
 * positions to score stays four to the sheet's area rather than one per pixel. Rounded down to a
 * whole number of cells wherever that is at least one cell, so every window starts on the lattice.
 */
export const PROXY_CROP_STRIDE = 0.5;

/**
 * How many times the descent goes round the stages, at most.
 *
 * **A coordinate descent cannot revisit what an earlier stage chose, and one round is one chance.**
 * The stages run in the pipeline's own order, so each is swept from dials the stages ahead of it have
 * settled — but the ones *behind* it are still at their opening positions while it runs. The reading
 * is chosen against a colour merge nobody has swept yet, and against a fill cleanup and an
 * anti-aliasing pass nobody has swept either. A second round sweeps every stage again from where the
 * first left everything, so each of those decisions is finally taken against the dials it shares a
 * pipeline with rather than against the ones the tab opened at.
 *
 * **This is a ceiling and not a cost**, because the sweep stops as soon as a round ends anywhere the
 * descent has already stood — see `autoTune`. Measured over the whole corpus at the grids
 * `tests/sheet-scale-corpus.test.ts` reads for them, every dial at its opening position, no keying
 * and no colour budget:
 *
 * | Sheet | Rounds | Positions |
 * | --- | --- | --- |
 * | `armour.png` (grid 6) | **6** | 403 |
 * | `character_space_marine_blue.png` (5) | 4 | 181 |
 * | `vehicles_and_props.png` (5) | 4 | 185 |
 * | `cyborg_black_red.png` (6) | 3 | 142 |
 * | `three-quarter-view_tiles1.png` (5) | 3 | 142 |
 * | `ui_elements1.png` (4) | 3 | 142 |
 * | `cyborg_monk.png` (4) | 3 | 134 |
 * | `cyborg_healer.png` (4) | 3 | 134 |
 *
 * **Eight is the worst of those eight plus headroom, and the headroom is the point.** A cap that a
 * sheet exactly reaches cannot be told apart from one that cut it short — and a cut descent does not
 * merely stop early, it answers with wherever the cut happened to fall. The reference sheet is the
 * case that says so: stopped at three it would have reported a likeness of 0.6525 for 112 colours,
 * where the position it reaches two rounds later is 0.6554 for the *same* 112 — strictly better on
 * both figures. Seven of the eight sheets never see the extra rounds at all, so the headroom is paid
 * only by a sheet that needs it.
 *
 * **A cap is still needed, because nothing guarantees the descent settles.** What the stages descend
 * on is a pair of figures ranked by an elbow rather than a scalar objective, and an elbow's knee
 * moves with the candidate set — so a descent can circle a loop instead of reaching a fixed point.
 * That is not a rare case, and it is not confined to synthetic fixtures: the reference sheet at a
 * colour budget of 16 with the anti-aliasing at `BOTH` circles for all eight rounds and never
 * repeats, and the fixture in `autoTune.test.ts` settles into a two-round loop — which is why the
 * stop compares against every position visited rather than only against the round before.
 */
export const TUNE_ROUNDS = 8;

/** The outline-expansion widths the reading stage tries — the dial's whole range. */
export const TUNE_OUTLINE_EXPANSIONS = [0, 1, 2, 3, 4] as const;

/**
 * The line strengths the ink stage tries — the dial's whole range, in half-steps.
 *
 * From the plain proportional blend at 1 to the dial's ceiling of 4, in the half-steps the dial's own
 * reasoning is written in: `LINE_STRENGTH_RANGE` records 1.5, 2 and 2.5 as the three positions
 * measured on the reference sheet, and this is that ladder carried to both ends of the range.
 *
 * **It used to stop at 3**, on the same file's note that past roughly there a one-third contour slice
 * is already pure ink and further travel only reaches thinner slices. That is a statement about where
 * the *returns* fall away, not about where the dial stops answering — a sheet whose linework is a
 * thin slice of each cell is exactly the sheet the last two rungs are for, and the elbow is what
 * refuses them where they buy nothing. A ladder that cannot reach a position cannot rule it out.
 */
export const TUNE_LINE_STRENGTHS = [1, 1.5, 2, 2.5, 3, 3.5, 4] as const;

/**
 * The trim strengths the ink stage tries, across the dial's whole range in half-steps.
 *
 * The same resolution as the line ladder beside it, which the same stage sweeps as one grid. It used
 * to be whole steps, on the argument that the dial is coarser in its effect — a bright rim is a
 * smaller share of a cell than a dark contour, so the difference between 1 and 1.5 here is less than
 * the same step on the line side. Less is not nothing, and a step worth half as much is an argument
 * for measuring it rather than for stepping over it. `0` leads, and is where the dial opens.
 */
export const TUNE_TRIM_STRENGTHS = [0, 0.5, 1, 1.5, 2, 2.5, 3] as const;

/**
 * The ink thresholds the ink stage tries, spanning `INK_THRESHOLD_RANGE` end to end.
 *
 * Eleven positions eight apart, which is the whole 16–96 range at twice the resolution the dial's own
 * note describes it in: restrict the pull to truly black strokes at the bottom, admit darker
 * artwork's outlines at the top. The spacing keeps `DEFAULT_INK_THRESHOLD` — 64, the darkest-quarter
 * anchor the dominant vote's rescue shares — on the ladder, which keeps the commonest sweep from
 * carrying the dial's own position as an extra candidate beside it.
 */
export const TUNE_INK_THRESHOLDS = [16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96] as const;

/**
 * The colour-merge tolerances the sweep tries, across `COLOR_MERGE_RANGE`.
 *
 * `0` first, because the merge not running is a real answer and the elbow should be able to reach it.
 * Then threes to 24 and fours above it: the dial is a perceptual distance, and a tolerance near zero
 * separates colours a reader can tell apart while one near the ceiling is folding everything whatever
 * it is set to — so the resolution is spent where the answer actually changes.
 */
export const TUNE_COLOR_MERGES = [0, 3, 6, 9, 12, 15, 18, 21, 24, 28, 32, 36, 40, 44, 48] as const;

/** The fill-cleanup tolerances the sweep tries, in fours across `FILL_CLEANUP_RANGE`, `0` first for the same reason. */
export const TUNE_FILL_CLEANUPS = [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48] as const;

/** The cleanup-pass counts the sweep tries — the dial's whole range, which is four positions. */
export const TUNE_CLEANUP_PASSES = [1, 2, 3, 4] as const;

/**
 * The contrast floors the anti-aliasing stage tries, across `ANTI_ALIAS_THRESHOLD_RANGE`.
 *
 * `0` first, because admitting every boundary the sheet holds is a real answer and the elbow should
 * be able to reach it — and because it is the floor of the dial's own range. Eights to 48 and
 * sixteens above it, for the reason the colour merge's ladder is spent that way: the quantity is a
 * perceptual distance, and past roughly half the range the only boundaries left are silhouettes and
 * hard outlines, so a finer step up there separates nothing. `DEFAULT_ANTI_ALIAS_THRESHOLD` — 24 — is
 * on the ladder.
 */
export const TUNE_ALIAS_THRESHOLDS = [0, 8, 16, 24, 32, 40, 48, 64, 80, 96] as const;

/**
 * The shortest runs the anti-aliasing stage tries, across `ANTI_ALIAS_RUN_RANGE`.
 *
 * Whole steps to 6 and then twos, because the dial is counted in drawn pixels: the difference between
 * admitting a three-pixel step and a four-pixel one decides what a small sprite looks like, while the
 * difference between ten and eleven is a couple of contours on a whole sheet. `2` leads — the floor
 * of the dial's range, where it opens, and the position that excludes nothing.
 */
export const TUNE_ALIAS_RUNS = [2, 3, 4, 5, 6, 8, 10, 12] as const;

/**
 * The strengths the anti-aliasing stage tries — the dial's whole range, in tens.
 *
 * The dial behind pixel-art practice's one standing rule about anti-aliasing, which is to use as
 * little of it as the shape needs, so the whole range is swept rather than a span around the opening
 * position: `DEFAULT_ANTI_ALIAS_STRENGTH` is 100 because the reconstructed coverage is an *answer*
 * about the shape, and every rung below it is a reader trading that answer for a quieter fringe. The
 * step is 10 rather than the dial's own 5 because this ladder is multiplied by
 * {@link TUNE_ALIAS_PALETTES} in the stage that sweeps it, and a twentieth of a coverage is below
 * what either figure the elbow ranks on can separate.
 */
export const TUNE_ALIAS_STRENGTHS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;

/**
 * Whether a blended shade may be a colour the sheet did not already hold — both positions.
 *
 * The union itself rather than a ladder written out beside it, because there are only two positions
 * and a copy of them here would be a second opinion about what the control offers. Swept only where a
 * colour reduction is in force, which is the one state the dial is read in at all — see
 * `AntiAliasPalette`, and the gate `quantiseImage` keeps at the call site.
 */
export const TUNE_ALIAS_PALETTES = ANTI_ALIAS_PALETTES;

/**
 * What each stage of the sweep is called, where the reader can see it.
 *
 * A record keyed by the union rather than a name carried on the stage itself, so a stage added to
 * `TUNE_STAGE_NAMES` fails to compile until it has a label a reader can read. The identifiers are the
 * app's own vocabulary — `INK_WEIGHTED`, the fill cleanup — and these are the same names in the words
 * the panels beside this one already use for those dials.
 */
export const TUNE_STAGE_LABELS: Readonly<Record<TuneStageName, string>> = {
  READING: 'Cell reading and outline expansion',
  INK_BLEND: 'Line and trim strength',
  INK_THRESHOLD: 'Ink threshold',
  COLOUR_MERGE: 'Colour merge',
  FILL_CLEANUP: 'Fill cleanup',
  CLEANUP_PASSES: 'Cleanup passes',
  ALIAS_CONTOUR: 'Anti-aliasing contrast floor',
  ALIAS_RUN: 'Anti-aliasing shortest run',
  ALIAS_BLEND: 'Anti-aliasing strength and blended shades',
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
  idle: 'The dials on this tab open at positions that suit some sheets and not others, and nothing on screen says which kind of sheet you have. This runs the pipeline over five busy crops of it, at several hundred combinations of the dials that decide how a cell is read, how its colours settle and how its contours are softened, and moves them to whichever came closest to the artwork for the fewest colours. It goes round the dials up to eight times, stopping as soon as a round retraces ground it has already covered, so each one is finally chosen against the others rather than against the positions they opened at.',
  running:
    'Running the pipeline over five crops of the sheet, once for each candidate, and going round the dials until they stop moving. It can take a minute or two on a large sheet, and the preview beside it keeps working throughout — the sweep is on a thread of its own.',
  settled:
    'The dials named below have moved; every other dial on this tab is exactly where you left it. One undo puts them all back. The likeness figure is structural similarity against the crops, where 1 is the artwork reproduced exactly, and the colour figure is what the result spent to get there — the sweep chose the position where one more colour started buying least, so a higher figure was available and was not worth its cost. The anti-aliasing pass is swept as you pointed it: where you left that control off it stays off, and where you turned it on the sweep found how much softening was worth its colours. One bias is worth knowing before you accept the reading it chose: on a sheet whose edges came back softened, an average genuinely sits closer to a soft edge than a hard one does, so likeness leans toward K_CENTROID even where the artwork lives on its contours. If yours does, try INK_WEIGHTED against what the sweep picked and judge the two in the preview.',
  failed:
    'The sweep produced nothing this time. The dials are untouched, so nothing about the sheet on screen has changed, and pressing Auto again is safe.',
} as const;
