import type {
  ColorReduction,
  GridMesh,
  QuantisePrologue,
  QuantiseResult,
  QuantiseSettings,
  QuantiseSheet,
} from '../types/quantiser.ts';
import { applyPalette, applyRgbPalette } from './applyPalette.ts';
import { snapToChannelDepth } from './channelDepth.ts';
import { differenceMap } from './differenceMap.ts';
import { alignToGrid, downscaleNearest } from './gridAlignment.ts';
import { despeckle } from './despeckle.ts';
import { ditherImage } from './ditherImage.ts';
import { ditherMatrix } from './ditherMatrix.ts';
import { mergeColors } from './mergeColors.ts';
import { colorHistogram } from './imageData.ts';
import { paletteEntriesFrom } from './paletteEntries.ts';
import { quantisePrologue } from './quantisePrologue.ts';
import { settleSprites } from './settleSprites.ts';
import { inkWeightedCells } from './inkWeightedVote.ts';
import { kCentroidCells } from './kCentroidVote.ts';
import { applyLockedPalette } from './lockedPalette.ts';
import { outlineExpansion } from './outlineExpansion.ts';
import { buildPalette } from './wuQuantiser.ts';

/**
 * The whole pipeline: key, harden, measure the mesh, read the cells down to pixels — with the colour
 * reduction on whichever side of the vote the chosen reading demands — and then read what it cost.
 *
 * ```
 * DOMINANT:                 ImageData → keyBackground → hardenSilhouette → outlineExpansion → reduceColors → alignToGrid → downscaleNearest
 * INK_WEIGHTED, K_CENTROID: ImageData → keyBackground → hardenSilhouette → outlineExpansion → cells resolved directly → reduceColors
 * with a dither, any reading:  … → cells resolved with no reduction at all → mergeColors → despeckle → ditherImage
 * then, on whatever that produced:
 *   spriteSegments → sheetSymmetry → snapSymmetric (SNAP only) → duplicateSprites → snapDuplicates
 *                  → sheetStrips → snapFrames (SNAP only) → antiAlias (last of all)
 *
 * boundaryMesh reads the keyed source, before the expansion — see below.
 * ```
 *
 * **The first three passes are `quantisePrologue` and the last one is the difference map, so this
 * function is three lines.** The split is the pipeline's own seam rather than a filing decision:
 * everything from the outline expansion down is a function of the dials, while the key, the
 * hardening and the mesh are a function of the sheet and three settings — and the difference map is
 * the one reading taken afterwards that nothing above it needs. A caller holding those three
 * settings fixed while it moves the dials — which is what the auto-tune sweep is — therefore has
 * the prologue in hand before it starts and never wants the map at all; see `quantisePrologue` and
 * {@link QuantiseSheet}, which carry what each of those was costing. **Every caller that is not
 * that sweep belongs here**, because this is the composition that cannot hand the transform a
 * prologue measured on a different sheet.
 *
 * **{@link quantiseFromPrologue} shares this file rather than taking one of its own**, because the
 * two are one pipeline: this is the composition and that is its body, and the order stated below is
 * the order of both. Splitting them would leave the argument for every pass in a file holding none
 * of them.
 *
 * Grid **detection** is not part of it. The grid is a setting because the user can overrule what
 * detection found — and must, when it found nothing — so resolving it belongs to the tab, and this
 * function is handed the answer. The key colour arrives the same way, from the studio setting the
 * prompt already stated it in.
 *
 * The **mesh** is the opposite: it is measured in the prologue, on the keyed sheet the readings are
 * about to walk — *before* the outline expansion moves anything, for the reason the comment beside
 * it gives — and it deliberately never becomes a setting. Measured from the sheet it is about to be
 * walked over, it is one mechanism serving all three ways a grid reaches this function — measured,
 * clicked or typed — so no two of them can disagree about where a cell begins; stored anywhere, it
 * would be the stale half of a pair the moment the user overtyped the grid beside it.
 *
 * **Which side of the vote the reduction runs on is the chosen reading's contract, not a fixed
 * order.** The dominant vote *selects* — a colour the cell already contains — and for it reducing
 * first is the quality of the whole result: on generated art every pixel of a cell is subtly
 * different, so a vote among raw colours is a tie the tie-break settles, and two neighbouring
 * cells of one flat region pick two subtly different pixels, which reads as speckle. Reducing
 * first collapses a region's hundred near-identical shades into one colour, so its cells vote for
 * *the same thing* — quantised voting, the ordering the tools this follows converged on. With no
 * reduction in force that vote runs over the raw colours, where the centre tie-break is the only
 * defence. The two averaging readings invert the order for the mirror-image reason: an average
 * *creates* colours — an ink-darkened gold, a settled cluster centre — and reducing first would
 * collapse exactly the tones it exists to blend, so they see the unreduced source and the
 * reduction runs on their output, where a budget's palette is chosen from the resolved sheet and
 * can keep the blended line tones.
 *
 * **A dither moves the whole palette step to the end, whichever reading is in force, and that is
 * the one ordering neither contract above survives.** A dither expresses a colour the palette does
 * not hold as a mixture of colours it does, so it has to run where such a colour still exists — and
 * a reduction is precisely the pass that removes them. Under the dominant vote that means the
 * reduction can no longer run *before* the tally, which costs the quantised vote its two defences:
 * the tie-break is again the only thing settling a cell of near-identical shades, and `alignToGrid`
 * is asked for a raw vote, whose tally holds every pixel as its own bucket and where the line
 * rescue's share therefore measures nothing. Both of those costs are answered by the pass that
 * replaces them: two cells landing on near-identical shades land on near-identical mixing plans, so
 * the speckle a raw vote leaves is folded back into one pattern. Dithering *before* the vote is the
 * arrangement that cannot work at all — a pattern laid down at source resolution is a pattern the
 * cell reading immediately votes away.
 *
 * **The sheet-wide merge and the fill cleanup then run ahead of it rather than after it**, which is
 * the mirror of the note below on why they normally run last. Their reason for coming after the
 * palette is that the cleanup should see the final colours; with a dither there are no final flat
 * colours to see, and running them over the pattern would be the two speckle passes dismantling the
 * speckle the reader asked for. Ahead of it they do exactly what they were built for, on the
 * reading's own output — and the merge's exemption for a *stated* palette lifts with them, because
 * at that point in the pipeline no pixel is a palette entry and there is nothing of the user's
 * statement to fold.
 *
 * **Keying still goes first, ahead of everything, and that is not interchangeable.** `alignToGrid`
 * resolves each cell to its modal colour, and on a drifting key field every background pixel is a
 * *distinct* colour polling one vote — so a cell holding 62 never-repeating magentas and 2 pixels
 * of one flat sprite colour resolves entirely to the **sprite**, which dilates the artwork into its
 * own background by up to a whole cell on every side. Keying first collapses that field to one
 * value before either the palette or the vote sees it, and the mesh is measured after it for the
 * same reason: a keyed field's drifting colours are steps the profile would otherwise count, and
 * collapsing them leaves the art's own boundaries as the only mass worth weighing.
 *
 * **The edge hardening sits between the two, and it is the key's own question asked of coverage.**
 * A sheet that arrives at its own pixel scale keeps whatever soft outline it was drawn with, because
 * at a grid of 1 the cell reading is a no-op and nothing else in the pipeline reaches a soft edge.
 * It goes behind the key so the two erosions cannot compound, and ahead of the mesh so the profile
 * weighs a hard boundary rather than a ramp — the same reason the key goes ahead of it.
 * `quantisePrologue` is where all three run, and it states what those two erosions are.
 *
 * **The symmetry pass goes last, after everything, and that is not interchangeable either.** It
 * scores a mirror axis *inside a sprite's bounds*, so it needs the segmentation — which is taken
 * from the alpha of the finished sheet — and it compares mirrored pixels by colour, so it wants the
 * colours the reader will actually get rather than the ones a palette step is about to replace. Both
 * point at the same place in the order: after the reading, the reduction, the two cleanups and any
 * dither. It is the one pass whose *own output* is then re-segmented, because settling a pair can
 * clear a pixel and a cleared pixel can split a region.
 *
 * **The frame alignment goes after even those, and it is the only pass that moves artwork rather
 * than editing it.** It fits a lattice to each row of sprites and carries the frames that wandered
 * off it back on, so it needs a segmentation of the sheet as it will actually be downloaded — which
 * the fold above may have changed the silhouettes of. Its own output is then re-segmented for the
 * same reason the settle's is: every box it moved is somewhere else afterwards.
 *
 * **The anti-aliasing goes last of all, and it is the only pass that puts smooth colour back.**
 * Everything above exists to take a resampled render apart into flat cells, which is what leaves
 * every contour a staircase of axis-aligned steps; this reads those steps back into the sub-pixel
 * coverage they imply. It has to be behind every pass that assumes flat colour — the fill cleanup is
 * built to remove exactly the lone intermediate pixel it writes — and behind the three readings
 * taken over the segmentation, which compare colours a softened contour would have moved. The
 * comment at the call site carries the rest of the argument.
 *
 * **The four passes from the symmetry settle onwards are in `settleSprites`**, with every
 * re-segmentation each of them forces. They are documented here because this is where the
 * pipeline's order is stated and they are the end of it; the argument for each one's position is
 * above, and the code is one call below.
 *
 * `colorHistogram` excludes fully transparent pixels, so the keyed field claims no palette slots,
 * and `applyPalette` copies it through untouched rather than mapping it onto a colour.
 *
 * Pure, and deliberately so — which is what let it move into `src/workers/quantiseWorker.ts` without
 * a line of it changing when a large sheet did stall. It no longer runs on the main thread at all:
 * every pass is linear, or near it, in a pixel count this app admits up to 16.8 million of, and a transform that
 * re-runs on each keystroke of the grid box has no business holding the one thread that could paint a
 * spinner.
 */
export function quantiseImage(image: ImageData, settings: QuantiseSettings): QuantiseResult {
  const prologue = quantisePrologue(image, settings);
  const sheet = quantiseFromPrologue(prologue, settings);

  return {
    ...sheet,
    // Measured here rather than asked for later, and against the prologue's source rather than the
    // image the caller handed in: the reduction this reports on is the one that ran, and the image
    // it ran on is the keyed and hardened one every pass worked from. Keying's own cost is
    // `keyedShare`, which the prologue carries for the same reason.
    //
    // **The source, not the expanded copy.** The outline expansion is part of what the reduction
    // cost, not a new baseline to measure the rest of it against — a reader turning that dial up is
    // asking what it did to their sheet, and a heatmap that had already accepted the thickened
    // contour as the truth would answer by going darker the harder the pass worked.
    difference: differenceMap(prologue.source, sheet.image, prologue.mesh),
  };
}

/**
 * The transform itself: everything from the outline expansion down, over a sheet whose key,
 * hardening and mesh a caller has already established.
 *
 * **The narrow answer, for the one caller that reads a narrow part of it.** `readCandidate` reads
 * {@link QuantiseSheet.image} and {@link QuantiseSheet.colors} and nothing else, and it runs this
 * 2,015 times in a sweep of `test_sprites/armour.png` — so building a difference map for it walked
 * the whole of every crop's source a second time to produce a value that was dropped on the next
 * line. {@link QuantiseSheet} says why that reading is the only one worth withholding, and why the
 * rest of them are free.
 *
 * **The prologue has to have been built from these settings.** Its three inputs are
 * {@link QuantiseSettings.key}, `silhouetteThreshold` and {@link QuantiseSettings.grid}, and nothing
 * here re-derives any of them to check — a mesh measured at another grid would cut this sheet into
 * cells it does not have, and every reading below would be right about the wrong image.
 * `quantiseImage` is the composition that gets this right by construction.
 *
 * The order of what follows, and the argument for each pass's position in it, is stated on
 * `quantiseImage` — this is the middle of one pipeline rather than a pipeline of its own.
 */
export function quantiseFromPrologue(prologue: QuantisePrologue, settings: QuantiseSettings): QuantiseSheet {
  const { source, mesh } = prologue;

  // The one pass that runs ahead of the vote rather than after it, because it is the only one whose
  // failure the vote cannot undo: a contour one drawn pixel wide is a minority in its own cell under
  // every reading, and by the time a cell has been resolved the ink is already gone.
  //
  // Skipped at the dial's off position rather than called and returning a copy, which is how
  // `reduceColors` is guarded three lines down and for the same reason: the copy alone is 67MB at
  // the ceiling this app admits, and it would be paid on every transform by every reader who never
  // touches this control.
  const expanded =
    settings.outlineExpansion <= 0
      ? source
      : outlineExpansion(source, settings.grid, settings.outlineExpansion);

  // **The two averaging readings invert the pipeline's colour order, and the inversion is the
  // point.** The dominant vote selects a colour the cell already contains, so reducing first is
  // what makes its tally honest. An average *creates* colours — an ink-darkened gold, a settled
  // cluster centre — and reducing first would collapse exactly the tones it exists to blend; so
  // those readings see the unreduced source, and the reduction runs on their output, where the
  // blended tones are real colours a palette chosen from it can keep.
  // The palette step in its positional form, where one was asked for *and* there is a palette to
  // dither against — with no reduction in force there is no colour a mixture could express that a
  // single colour could not. Resolving both here is what lets the rest of the function read
  // `positional === null` as "the palette step runs in its usual place".
  const matrix = ditherMatrix(settings.dither);
  const positional =
    matrix !== null && settings.reduction !== null ? { matrix, reduction: settings.reduction } : null;
  // What the *reading* reduces with: nothing at all while a dither is holding the palette step back
  // to the end of the pipeline.
  const reduction = positional === null ? settings.reduction : null;

  const resolved =
    settings.vote === 'DOMINANT'
      ? downscaleNearest(
          alignToGrid(
            // `UNRESTRICTED` with no palette pinned skips the step outright rather than reducing
            // to some generous figure. A painted or 3D-rendered sheet has no colour budget to
            // enforce, and a high cap is still a cap. Line-aware only where a reduction ran: the
            // rescue reads shares out of the tally, and a share means nothing in a raw-colour
            // vote where every pixel is its own bucket — see `alignToGrid`.
            reduction === null ? expanded : reduceColors(expanded, reduction),
            mesh,
            reduction !== null,
          ),
          mesh,
        )
      : reduceAfter(
          settings.vote === 'INK_WEIGHTED'
            ? inkWeightedCells(
                expanded,
                mesh,
                settings.lineStrength,
                settings.trimStrength,
                settings.inkThreshold,
              )
            : kCentroidCells(expanded, mesh),
          reduction,
        );

  // After the reading, whatever the reading: speckle is a property of any reading's output. With no
  // dither in force these two come after the palette step as well, because the cleanup wants to see
  // the final colours — palette entries included — not the ones a reduction is about to replace;
  // with one, the palette step is behind them and there are no final colours yet to see. Both
  // orderings are stated in the docblock above.
  //
  // Merge first, then despeckle: folding near-duplicate colours sheet-wide is what lets settled
  // fills form the majorities the per-pixel cleanup needs. A *pinned* palette is exempt from the
  // merge — its entries are the user's explicit statement of which colours are distinct, and a
  // cleanup dial must not quietly un-pin two of them into one.
  //
  // **A locked palette is exempt on the same ground**, and it is the stronger case of the two: its
  // entries are what the next sheet in the series will be mapped onto, so a merge that folded two
  // of them here would be the cleanup dial quietly editing the lock — and the sheets either side of
  // this one would keep the pair it removed.
  //
  // **Both exemptions lift under a dither**, and `mergeIsExempt` gets that by testing the dither
  // itself: under one the palette step has not run yet, so no pixel here is a palette entry and
  // there is no entry of the user's for a fold to edit.
  const merged = mergeIsExempt(settings) ? resolved : mergeColors(resolved, settings.colorMerge);
  const cleaned = despeckle(merged, settings.fillCleanup, settings.cleanupPasses);
  // And the palette step last of all where a dither holds it — see the note above on why it cannot
  // run anywhere else, and why these two passes come before it rather than after.
  const reduced =
    positional === null ? cleaned : ditherImage(cleaned, positional.reduction, positional.matrix);

  // Everything past this point needs the sheet segmented first — see `settleSprites`, which is
  // where those four passes and the re-readings each of them forces now live.
  const settled = settleSprites(reduced, settings);
  const output = settled.image;

  // One walk over the finished sheet, read twice below. `colorHistogram` excludes fully transparent
  // pixels, so a keyed field claims neither a colour of the count nor an entry of the palette.
  const histogram = colorHistogram(output);

  return {
    image: output,
    // Read off the finished sheet, so what it counts is what the reader is looking at — and after
    // the cleanups, which is where a speck that would otherwise have been counted as a sprite goes.
    // It is here unconditionally because `settleSprites` had to take it in order to edit the sheet
    // at all, so no caller pays anything to be told: a reading fetched separately could describe an
    // older result than the one beside it, and this one is compared against a dial that has just
    // moved. See `spriteSegments` for what it does with each kind of sheet, and `settleSprites` for
    // which of the four passes above force it to be re-taken and why each one is paid for only by
    // the reader who asked for that edit.
    sprites: settled.sprites,
    symmetry: settled.symmetry,
    // The finding, always as it stood on the sheet the reading was taken from — see
    // `QuantiseResult.duplicates` for why the fold does not get to re-take it.
    duplicates: settled.duplicates,
    snapped: settled.snapped,
    // The reading, always as it stood on the sheet it was taken from — see `QuantiseResult.strips`,
    // which is where the reason lives, and it is the same one `duplicates` carries.
    strips: settled.strips,
    // The comparison view places the result against the source with this — see `QuantiseResult`.
    offset: meshOffset(mesh, settings.grid),
    // Only the result is counted here. The figure it is read against belongs to the sheet rather than
    // to any setting, so it is measured once when the sheet loads — see `SheetFacts`.
    //
    // One histogram answers both of the next two lines. They are different questions — how many
    // distinct pixel values the sheet holds, and which colours it is made of, which differ wherever
    // one colour appears at several coverages — and taking a pass each would be a second walk over
    // the whole result for an answer already in hand.
    colors: histogram.size,
    paletteEntries: paletteEntriesFrom(histogram),
    // A fact the key established, so carried through from where the key ran rather than re-derived
    // from a result every pass since has been editing.
    keyedShare: prologue.keyedShare,
  };
}

/**
 * The mesh's leading-cell placement, in the terms the comparison view draws with.
 *
 * The panes draw the result at one uniform magnification, so what they need from the mesh is how
 * wide its leading partial cell is on each axis — the second start, where the first is the image
 * edge at 0. A mesh whose cells drift can put any interior cut a pixel or two off the uniform
 * position, which a uniformly scaled canvas cannot represent; the leading cell dominates the error,
 * and correcting it keeps the panes within the drift itself, exact whenever the art is regular.
 *
 * **It reads a bound cell, not an arbitrary one**, and that is what keeps the inset a rendering
 * correction rather than a compensation for the result itself. `boundEndCells` in `gridMesh.ts`
 * merges an end band of fewer than three source pixels into the cell beside it, so what this reports
 * is a cell that genuinely holds a band of the sheet — never the one-pixel band that used to reach
 * here, which this view nudged the pane for while the exported file carried it as an ordinary row.
 */
function meshOffset(mesh: GridMesh, grid: number): { x: number; y: number } {
  const leading = (starts: readonly number[]): number => {
    const second = starts[1];
    return second !== undefined && second < grid ? second : 0;
  };
  return { x: leading(mesh.x), y: leading(mesh.y) };
}

/**
 * The palette step, in whichever of its four forms was asked for.
 *
 * Three of them come from the studio and the fourth from this tab: a palette locked off an earlier
 * result supersedes the studio's setting outright while it is held, which `colorPlanFor` decides —
 * so by the time a reduction reaches here there is exactly one of them, and no precedence left to
 * apply. `applyLockedPalette` is the one that may leave a colour alone, beyond its snap distance.
 *
 * **A pinned palette is applied on its own, never after a budget reduction.** Reducing to N colours
 * and then mapping those onto a fixed list is two quantisations where one was asked for, and the
 * first of them throws away exactly the information the second needs — a Game Boy's four shades are
 * much better chosen from the image's own colours than from four the quantiser picked first.
 *
 * The *on-screen* colour limit a machine imposes is deliberately not enforced here either. It is a
 * per-frame figure, and a sprite sheet is not a frame: it is the source artwork a frame is later
 * assembled from, so nothing on this side knows which components would ever be visible together.
 * The prompt states it; this makes the colours legal.
 *
 * **The palette arms take different functions, and it is not an oversight.** A budget's palette
 * comes from this very image and its entries are real pixels of it, alpha and all, so it is written
 * whole; a machine's palette is a list of colours with no fourth channel, so writing it whole would
 * flatten every soft edge to opaque, and a locked palette holds another sheet's colours, whose
 * coverages are facts about that sheet rather than this one. `applyPalette`, `applyRgbPalette` and
 * `applyLockedPalette` say which is which.
 */
function reduceColors(image: ImageData, reduction: ColorReduction): ImageData {
  switch (reduction.kind) {
    case 'MAX_COLORS':
      return applyPalette(image, buildPalette(image, reduction.maxColors));
    case 'PALETTE':
      return applyRgbPalette(image, reduction.entries);
    case 'LOCKED':
      return applyLockedPalette(image, reduction.entries, reduction.snap);
    case 'CHANNEL_DEPTH':
      return snapToChannelDepth(image, reduction.bitsPerChannel);
  }
}

/**
 * Whether the reduction's colours were *stated* rather than chosen from this sheet.
 *
 * The two that were — a palette pinned in the studio and a palette locked off an earlier result —
 * are the two the sheet-wide colour merge may not touch, for the reason given where it runs. The
 * other two chose their colours from this image, so folding two of them together takes nothing back
 * from anybody.
 */
function statedPalette(reduction: ColorReduction | null): boolean {
  return reduction?.kind === 'PALETTE' || reduction?.kind === 'LOCKED';
}

/**
 * Whether the sheet-wide colour merge is held back — asked of the settings alone, so a caller that
 * is not the pipeline can ask it too.
 *
 * **The merge does not run where the reader has *stated* which colours the sheet is made of**, a
 * pinned palette or one locked off an earlier sheet: those entries are an explicit statement that
 * two colours are distinct, and a cleanup dial must not quietly un-pin a pair of them. The exemption
 * lifts under a dither, because there the palette step has not run yet and no pixel is a palette
 * entry, so there is nothing of the reader's for a fold to edit.
 *
 * Exported because the auto-tune sweep has to know: a stage that swept the merge's ladder under a
 * stated palette would run fifteen candidates a round over one image, and would tell the reader it
 * had moved a dial that reached nothing. `TUNE_CELL_STAGES` asks this rather than restating it — a
 * second copy of the condition is a second opinion about when the pass runs.
 */
export function mergeIsExempt(settings: QuantiseSettings): boolean {
  // Asked of the dither itself rather than of the pipeline's `positional` local, which a caller
  // asking this from outside does not have. The two part company only where a dither is set with no
  // reduction in force, and there `statedPalette(settings.reduction)` is false anyway — a dither is
  // only positional at all where a reduction is in force.
  return ditherMatrix(settings.dither) === null && statedPalette(settings.reduction);
}

/**
 * The palette step for an averaging reading: the same four forms, run on the reading's own
 * output.
 *
 * A budget's palette is chosen from the *resolved* sheet rather than the source, deliberately —
 * the ink-darkened tones an averaging reading creates are the detail it exists to keep, and a
 * palette chosen from the source would hold only the colours those blends replaced, snapping every
 * one of them back to the body it was darkened from. `null` leaves the blends untouched, exactly
 * as it leaves an unreduced dominant vote untouched.
 */
function reduceAfter(cells: ImageData, reduction: ColorReduction | null): ImageData {
  return reduction === null ? cells : reduceColors(cells, reduction);
}
