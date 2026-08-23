import type { ColorReduction, GridMesh, QuantiseResult, QuantiseSettings } from '../types/quantiser.ts';
import { antiAlias } from './antiAlias.ts';
import { applyPalette, applyRgbPalette } from './applyPalette.ts';
import { snapToChannelDepth } from './channelDepth.ts';
import { differenceMap } from './differenceMap.ts';
import { duplicateSprites } from './duplicateSprites.ts';
import { alignToGrid, downscaleNearest } from './gridAlignment.ts';
import { boundaryMesh } from './gridMesh.ts';
import { despeckle } from './despeckle.ts';
import { ditherImage } from './ditherImage.ts';
import { ditherMatrix } from './ditherMatrix.ts';
import { mergeColors } from './mergeColors.ts';
import { countColors } from './imageData.ts';
import { inkWeightedCells } from './inkWeightedVote.ts';
import { kCentroidCells } from './kCentroidVote.ts';
import { hardenSilhouette } from './hardenSilhouette.ts';
import { keyBackground } from './keyBackground.ts';
import { applyLockedPalette } from './lockedPalette.ts';
import { outlineExpansion } from './outlineExpansion.ts';
import { sheetSymmetry } from './symmetryAxis.ts';
import { snapSymmetric } from './symmetrySnap.ts';
import { sheetStrips } from './frameAlignment.ts';
import { snapFrames } from './frameSnap.ts';
import { snapDuplicates } from './snapDuplicates.ts';
import { spriteSegments } from './spriteSegments.ts';
import { buildPalette } from './wuQuantiser.ts';

/**
 * The whole pipeline: key, harden, measure the mesh, read the cells down to pixels — with the colour
 * reduction on whichever side of the vote the chosen reading demands.
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
 * Grid **detection** is not part of it. The grid is a setting because the user can overrule what
 * detection found — and must, when it found nothing — so resolving it belongs to the tab, and this
 * function is handed the answer. The key colour arrives the same way, from the studio setting the
 * prompt already stated it in.
 *
 * The **mesh** is the opposite: it is measured here, on the keyed sheet the readings are about to
 * walk — *before* the outline expansion moves anything, for the reason the comment beside it gives —
 * and it deliberately never becomes a setting. Measured once per transform, it is one
 * mechanism serving all three ways a grid reaches this function — measured, clicked or typed — so
 * no two of them can disagree about where a cell begins; stored anywhere, it would be the stale
 * half of a pair the moment the user overtyped the grid beside it.
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
 * weighs a hard boundary rather than a ramp — the same reason the key goes ahead of it. The call
 * site carries the argument in full.
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
  // `null` skips the pass outright rather than keying against some default colour: the studio's key
  // may be `TRANSPARENT`, which names no colour at all, and the user may simply not have asked.
  const keyed = settings.key === null ? null : keyBackground(image, settings.key);
  // **Second, immediately behind the key and ahead of everything else**, because it answers the key's
  // own question — what counts as background — by coverage where the key answers it by colour. It is
  // the one pass that reaches a soft edge on a sheet already at its own pixel scale, where the mesh
  // reading is a no-op; `hardenSilhouette` carries the rest of that argument.
  //
  // **After the key rather than before it**, and the order is not interchangeable. `keyBackground`
  // admits an already-transparent pixel into its field and erodes one pixel inward from it, so a
  // hardening that ran first would hand the key a wider field than the sheet has and the two erosions
  // would compound into a silhouette neither dial asked for. Behind it, the key never sees a pixel
  // this cleared. Nothing is lost by the order either: `keyBackground` writes only full transparency
  // or the pixel it was handed, so there is no partial alpha of its own for this to threshold — the
  // coverage it reads is always the sheet's own.
  const source = hardenSilhouette(keyed?.image ?? image, settings.silhouetteThreshold);
  const pixels = image.width * image.height;

  // Measured on the un-reduced image: the reduction can merge two adjacent regions into one colour
  // and erase the boundary between them, and a boundary the mesh cannot see is a cut it cannot snap.
  //
  // **And on the un-expanded one, for the mirror of that reason.** The reduction can *erase* a
  // boundary; the outline expansion can **move** one, by up to its thickness and asymmetrically, in
  // whichever direction the local polarity won. A mesh measured through that shift would place its
  // cuts against a contour the artwork does not have — so the mesh reads the sheet as it arrived
  // from the key, and every reading below walks that mesh over the expanded copy.
  const mesh = boundaryMesh(source, settings.grid);

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
  // **Both exemptions lift under a dither**, which `statedPalette` expresses rather than checks for:
  // the reduction it is handed is `null` there, because the palette has not been applied yet, so
  // there is no entry of the user's for a fold to edit.
  const merged = statedPalette(reduction) ? resolved : mergeColors(resolved, settings.colorMerge);
  const cleaned = despeckle(merged, settings.fillCleanup, settings.cleanupPasses);
  // And the palette step last of all where a dither holds it — see the note above on why it cannot
  // run anywhere else, and why these two passes come before it rather than after.
  const reduced =
    positional === null ? cleaned : ditherImage(cleaned, positional.reduction, positional.matrix);

  // **The last passes of all, and the two of them run *over a reading* rather than over the sheet.**
  // Both ask a question about the sprites the sheet holds — is this one symmetric, is this one a
  // repeat of that one — so both need the segmentation to exist before they can ask anything, and
  // both are taken here rather than earlier for that reason.
  //
  // The order between them is stated rather than incidental: **the symmetry settle runs first, and
  // the duplicate reading is then taken over what it produced.** A settle can bring two sprites that
  // differed only in their drift into agreement, so reading duplicates first would be reading a
  // sheet the reader is not going to get — and the fold copies whole blocks, so it should copy the
  // finished sprite rather than one that is about to be settled again in place.
  //
  // Each reading therefore describes the sheet as it stood immediately before *its own* edit, which
  // is the only state in which either means anything: a sprite that has just been made symmetric
  // reports perfect confidence whatever it arrived as, and a member that has just been overwritten
  // with its canonical is an exact duplicate of it by construction.
  const segmented = spriteSegments(reduced, settings.spriteGap);

  // `OFF` skips the sweep outright rather than scoring and discarding, which is how the outline
  // expansion and the reductions are guarded: it converts every pixel of every sprite to OKLab, and
  // that is not a cost to pay for a reader who never turns the control on. A sheet that did not
  // segment is skipped for a different reason — there are no bounds to score inside — and the empty
  // array says so, where `null` would say the reader had left the pass off.
  const symmetry =
    settings.symmetry === 'OFF'
      ? null
      : sheetSymmetry(
          reduced,
          segmented.kind === 'SEGMENTED' ? segmented.boxes : [],
          settings.symmetryTolerance,
          // A percentage on the dial and a share here, because the dial is a figure a reader reads
          // and this is a figure a confidence is compared with. `CHECK` passes `null`, which is the
          // one thing that means "settle nothing" — a floor of 100 still settles a sprite that is
          // already exact.
          settings.symmetry === 'SNAP' ? settings.symmetryConfidence / 100 : null,
        );
  const settled = symmetry === null ? reduced : snapSymmetric(reduced, symmetry);
  // Re-read where the settle moved a pixel, and reused where it did not. A settle can clear a pixel
  // whose partner was clear, and a pixel cleared out of a one-pixel bridge parts the region that ran
  // through it — so the boxes the duplicate reading is taken over have to come from the sheet that
  // reading is about. `snapSymmetric` hands back its argument by reference wherever nothing moved,
  // which is what makes the comparison the cheap way to ask.
  const settledSprites = settled === reduced ? segmented : spriteSegments(settled, settings.spriteGap);

  // **The reading runs whether or not the fold does**, because it is a fact the result carries
  // either way, and because the fold has nothing to act on until it exists. It is skipped where the
  // segmentation found no sprites to compare: `SOLID` and `SCATTERED` carry no boxes at all, which
  // is the honest answer rather than a shape a duplicate reading could be taken over — see
  // `SpriteSegmentation`.
  const boxes = settledSprites.kind === 'SEGMENTED' ? settledSprites.boxes : [];
  const duplicates = duplicateSprites(settled, boxes, settings.duplicateTolerance);
  // The fold is skipped where it has nothing to fold, rather than called and returning a copy: the
  // copy alone is 67MB at the ceiling this app admits, and `reduceColors` and the outline expansion
  // are both guarded the same way and for the same reason.
  //
  // **`snapped` is what the fold actually did**, not that it was asked for. A dial switched on over
  // a sheet with no repeats folds nothing, and so does one whose every member sits too close to a
  // neighbour to be redrawn — see `snapDuplicates`. Reporting either as a fold would have the panel
  // announcing an edit that did not happen, and would pay a second segmentation for it.
  const fold =
    settings.duplicateSnap && duplicates.length > 0 ? snapDuplicates(settled, duplicates, boxes) : null;
  const snapped = fold !== null && fold.folded > 0;
  const folded = fold !== null && snapped ? fold.image : settled;
  const foldedSprites = snapped ? spriteSegments(folded, settings.spriteGap) : settledSprites;

  // **The last reading of all, and the only pass that *moves* artwork rather than editing it.** It
  // asks a question about the rows the sprites are laid out in — does this run hold still — so it
  // needs the segmentation, and it needs the one taken over the sheet as it will actually be
  // downloaded: every pass above may have changed a silhouette, and a strip is fitted to where the
  // silhouettes are. That is also why it goes after the fold rather than before it. The fold copies
  // whole sprites between positions, so reading strips first would fit a lattice to a layout the
  // fold is about to change.
  //
  // `OFF` skips it outright rather than reading and discarding, which is how the outline expansion,
  // the reductions and the symmetry sweep are all guarded: it registers every frame of every row
  // against that row's first frame, and that is not a cost to pay for a reader who never turns the
  // control on.
  const strips =
    settings.frameAlignment === 'OFF'
      ? null
      : sheetStrips(
          folded,
          foldedSprites.kind === 'SEGMENTED' ? foldedSprites.boxes : [],
          // `null` is the one thing that means "move nothing" — a tolerance of 0 still moves every
          // frame that is off its slot, which is the strictest position rather than an off one.
          settings.frameAlignment === 'SNAP' ? settings.frameDriftTolerance : null,
        );
  // `snapFrames` hands back its argument by reference wherever no frame was marked, which is what
  // makes the comparison below the cheap way to ask whether the sheet moved — the same contract
  // `snapSymmetric` keeps, and the same reason: a re-segmentation is a linear pass nobody should pay
  // for a sheet that did not change.
  const realignment = strips === null ? null : snapFrames(folded, strips);
  const realigned = realignment !== null && realignment.moved > 0;
  const aligned = realignment !== null && realigned ? realignment.image : folded;

  // **The last pass of all, and the only one that puts smooth colour back.** Everything above takes
  // a resampled render apart into flat cells, which is what turns a returned sheet into pixel art
  // and what leaves every contour a staircase of axis-aligned steps; this reads those steps back
  // into the sub-pixel coverage they imply and writes it. See `antiAlias` for the geometry and its
  // grounding.
  //
  // **Nothing may run after it, and the order is not interchangeable.** It is the one pass that
  // deliberately creates colours between the palette's, so every pass that assumes flat colour has
  // to be behind it — the fill cleanup most of all, which is built to remove exactly the lone
  // intermediate pixel this writes. The three readings taken over the segmentation compare
  // *colours*, so two frames that are exact duplicates before it differ afterwards wherever their
  // contours sit differently against the mesh. And the frame alignment moves whole frames, so a
  // fringe computed against a neighbour a frame no longer has is a fringe against nothing.
  //
  // The strength is a percentage on the dial and a fraction here, as the symmetry confidence is:
  // one is a figure a reader reads, the other is a figure a coverage is multiplied by. The snap is
  // gated on a reduction being in force for the reason `AntiAliasPalette` gives — with no palette
  // stated there is nothing for a blend to be kept to — which is the same gate the dither keeps.
  const output = antiAlias(aligned, {
    mode: settings.antiAlias,
    threshold: settings.antiAliasThreshold,
    strength: settings.antiAliasStrength / 100,
    shortestRun: settings.antiAliasRun,
    snap: settings.antiAliasPalette === 'SNAP' && settings.reduction !== null,
  });

  return {
    image: output,
    // Measured here rather than asked for later, and against `source` rather than `image`: the
    // reduction this reports on is the one that ran, and the image it ran on is the keyed and
    // hardened one every pass above worked from. Keying's own cost is `keyedShare`, two lines down.
    //
    // **`source`, not `expanded`.** The outline expansion is part of what the reduction cost, not a
    // new baseline to measure the rest of it against — a reader turning that dial up is asking what
    // it did to their sheet, and a heatmap that had already accepted the thickened contour as the
    // truth would answer by going darker the harder the pass worked.
    difference: differenceMap(source, output, mesh),
    // Read off the finished sheet, so what it counts is what the reader is looking at — and after
    // the cleanups, which is where a speck that would otherwise have been counted as a sprite goes.
    // It runs unconditionally for the reason the difference map does: a reading fetched separately
    // could describe an older result than the one beside it, and this one is compared against a
    // dial that has just moved. Its cost is one linear pass, and it is skipped outright wherever the
    // result carries no transparency at all — which is the ordinary state on this tab, since keying
    // opens off, but is a property of the *result* rather than of the keying setting: a sheet that
    // arrived carrying its own alpha is segmented whether the key pass ran or not. See
    // `spriteSegments` for what it does with the sheets that are not skipped.
    //
    // **Re-read once more where the fold ran**, on top of the re-read the settle may already have
    // cost, and once more again where a frame was moved. A folded member takes the canonical's
    // silhouette, so its bounds and its pixel count are both the canonical's afterwards rather than
    // the ones it arrived with; a moved frame keeps its silhouette and changes where it is. Either
    // way the sheet a reader downloads is the one these figures have to describe. Each re-reading is
    // a linear pass, and each is paid only by the reader who asked for the edit that made it
    // necessary.
    //
    // **Re-read once more where a silhouette may have moved.** The condition is the image's own
    // identity, because `snapFrames` and `antiAlias` both hand back their argument by reference
    // wherever they changed nothing — so comparing with the sheet the fold left covers both passes
    // at once. A soft fringe is drawn artwork, since `spriteSegments` counts a pixel unless its
    // alpha is exactly zero, so it grows each box by a pixel and that box is what an atlas cell has
    // to seat.
    //
    // **`INTERIOR` is exempted, and provably rather than by assumption.** That position claims only
    // boundaries whose two pixels are both non-clear — `inScope` in `edgeClaims` — and
    // `coverageBlend` interpolates the two alphas, so the result is a convex combination of two
    // values at or above one, which cannot round to zero. No pixel is cleared and no pixel stops
    // being clear, so no box can move however many interior pixels changed. Without this the pass
    // would pay a full linear re-segmentation for an answer identical to the one it already has.
    sprites:
      output === folded || settings.antiAlias === 'INTERIOR'
        ? foldedSprites
        : spriteSegments(output, settings.spriteGap),
    symmetry,
    // The finding, always as it stood on the sheet the reading was taken from — see
    // `QuantiseResult.duplicates` for why the fold does not get to re-take it.
    duplicates,
    snapped,
    // The reading, always as it stood on the sheet it was taken from — see `QuantiseResult.strips`,
    // which is where the reason lives, and it is the same one `duplicates` carries.
    strips,
    // The comparison view places the result against the source with this — see `QuantiseResult`.
    offset: meshOffset(mesh, settings.grid),
    // Only the result is counted here. The figure it is read against belongs to the sheet rather than
    // to any setting, so it is measured once when the sheet loads — see `SheetFacts`.
    colors: countColors(output),
    // No zero-pixel guard: `ImageData`'s constructor throws `IndexSizeError` for a zero width or
    // height, so an image with nothing in it cannot reach this line and a division by zero has no way
    // to arise. A guard against it would be a comment claiming to protect against the impossible.
    keyedShare: keyed === null ? 0 : keyed.keyedPixels / pixels,
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
