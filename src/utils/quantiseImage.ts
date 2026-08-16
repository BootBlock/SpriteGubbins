import type { ColorReduction, GridMesh, QuantiseResult, QuantiseSettings } from '../types/quantiser.ts';
import { applyPalette, applyRgbPalette } from './applyPalette.ts';
import { snapToChannelDepth } from './channelDepth.ts';
import { alignToGrid, downscaleNearest } from './gridAlignment.ts';
import { boundaryMesh } from './gridMesh.ts';
import { despeckle } from './despeckle.ts';
import { mergeColors } from './mergeColors.ts';
import { countColors } from './imageData.ts';
import { inkWeightedCells } from './inkWeightedVote.ts';
import { kCentroidCells } from './kCentroidVote.ts';
import { keyBackground } from './keyBackground.ts';
import { buildPalette } from './medianCut.ts';

/**
 * The whole pipeline: key, measure the mesh, read the cells down to pixels — with the colour
 * reduction on whichever side of the vote the chosen reading demands.
 *
 * ```
 * DOMINANT:                 ImageData → keyBackground → reduceColors → boundaryMesh → alignToGrid → downscaleNearest
 * INK_WEIGHTED, K_CENTROID: ImageData → keyBackground → boundaryMesh → cells resolved directly → reduceColors
 * ```
 *
 * Grid **detection** is not part of it. The grid is a setting because the user can overrule what
 * detection found — and must, when it found nothing — so resolving it belongs to the tab, and this
 * function is handed the answer. The key colour arrives the same way, from the studio setting the
 * prompt already stated it in.
 *
 * The **mesh** is the opposite: it is measured here, on the very image the alignment is about to
 * walk, and it deliberately never becomes a setting. Measured once per transform, it is one
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
 * **Keying still goes first, ahead of everything, and that is not interchangeable.** `alignToGrid`
 * resolves each cell to its modal colour, and on a drifting key field every background pixel is a
 * *distinct* colour polling one vote — so a cell holding 62 never-repeating magentas and 2 pixels
 * of one flat sprite colour resolves entirely to the **sprite**, which dilates the artwork into its
 * own background by up to a whole cell on every side. Keying first collapses that field to one
 * value before either the palette or the vote sees it, and the mesh is measured after it for the
 * same reason: a keyed field's drifting colours are steps the profile would otherwise count, and
 * collapsing them leaves the art's own boundaries as the only mass worth weighing.
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
  const source = keyed?.image ?? image;
  const pixels = image.width * image.height;

  // Measured on the un-reduced image: the reduction can merge two adjacent regions into one colour
  // and erase the boundary between them, and a boundary the mesh cannot see is a cut it cannot snap.
  const mesh = boundaryMesh(source, settings.grid);

  // **The two averaging readings invert the pipeline's colour order, and the inversion is the
  // point.** The dominant vote selects a colour the cell already contains, so reducing first is
  // what makes its tally honest. An average *creates* colours — an ink-darkened gold, a settled
  // cluster centre — and reducing first would collapse exactly the tones it exists to blend; so
  // those readings see the unreduced source, and the reduction runs on their output, where the
  // blended tones are real colours a palette chosen from it can keep.
  const resolved =
    settings.vote === 'DOMINANT'
      ? downscaleNearest(
          alignToGrid(
            // `UNRESTRICTED` with no palette pinned skips the step outright rather than reducing
            // to some generous figure. A painted or 3D-rendered sheet has no colour budget to
            // enforce, and a high cap is still a cap. Line-aware only where a reduction ran: the
            // rescue reads shares out of the tally, and a share means nothing in a raw-colour
            // vote where every pixel is its own bucket — see `alignToGrid`.
            settings.reduction === null ? source : reduceColors(source, settings.reduction),
            mesh,
            settings.reduction !== null,
          ),
          mesh,
        )
      : reduceAfter(
          settings.vote === 'INK_WEIGHTED'
            ? inkWeightedCells(
                source,
                mesh,
                settings.lineStrength,
                settings.trimStrength,
                settings.inkThreshold,
              )
            : kCentroidCells(source, mesh),
          settings.reduction,
        );

  // Last of all, whatever the reading: speckle is a property of any reading's output, and the
  // cleanup wants to see the final colours — palette entries included — not the ones a reduction
  // is about to replace.
  // Merge first, then despeckle: folding near-duplicate colours sheet-wide is what lets settled
  // fills form the majorities the per-pixel cleanup needs. A *pinned* palette is exempt from the
  // merge — its entries are the user's explicit statement of which colours are distinct, and a
  // cleanup dial must not quietly un-pin two of them into one.
  const merged =
    settings.reduction?.kind === 'PALETTE' ? resolved : mergeColors(resolved, settings.colorMerge);
  const output = despeckle(merged, settings.fillCleanup, settings.cleanupPasses);

  return {
    image: output,
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
 */
function meshOffset(mesh: GridMesh, grid: number): { x: number; y: number } {
  const leading = (starts: readonly number[]): number => {
    const second = starts[1];
    return second !== undefined && second < grid ? second : 0;
  };
  return { x: leading(mesh.x), y: leading(mesh.y) };
}

/**
 * The palette step, in whichever of its three forms the studio asked for.
 *
 * **A pinned palette is applied on its own, never after a median cut.** Reducing to N colours and
 * then mapping those onto a fixed list is two quantisations where one was asked for, and the first
 * of them throws away exactly the information the second needs — a Game Boy's four shades are much
 * better chosen from the image's own colours than from four the median cut picked first.
 *
 * The *on-screen* colour limit a machine imposes is deliberately not enforced here either. It is a
 * per-frame figure, and a sprite sheet is not a frame: it is the source artwork a frame is later
 * assembled from, so nothing on this side knows which components would ever be visible together.
 * The prompt states it; this makes the colours legal.
 *
 * **The two palette arms take different functions, and it is not an oversight.** A budget's palette
 * comes from this very image and carries the alpha median cut split it on, so it is written whole; a
 * machine's palette is a list of colours with no fourth channel, so writing it whole would flatten
 * every soft edge to opaque. `applyPalette` and `applyRgbPalette` say which is which.
 */
function reduceColors(image: ImageData, reduction: ColorReduction): ImageData {
  switch (reduction.kind) {
    case 'MAX_COLORS':
      return applyPalette(image, buildPalette(image, reduction.maxColors));
    case 'PALETTE':
      return applyRgbPalette(image, reduction.entries);
    case 'CHANNEL_DEPTH':
      return snapToChannelDepth(image, reduction.bitsPerChannel);
  }
}

/**
 * The palette step for an averaging reading: the same three forms, run on the reading's own
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
