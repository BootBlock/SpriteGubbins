import type { ColorReduction, QuantiseResult, QuantiseSettings } from '../types/quantiser.ts';
import { applyPalette, applyRgbPalette } from './applyPalette.ts';
import { snapToChannelDepth } from './channelDepth.ts';
import { alignToGrid, downscaleNearest } from './gridAlignment.ts';
import { countColors } from './imageData.ts';
import { keyBackground } from './keyBackground.ts';
import { buildPalette } from './medianCut.ts';

/**
 * The whole pipeline: key, align, downscale, reduce.
 *
 * ```
 * ImageData  →  keyBackground  →  alignToGrid  →  downscaleNearest  →  applyPalette  →  ImageData
 *               (the key field    (cells become    (one pixel per      (palette
 *                becomes alpha)    one colour)      cell, exact)        reduction)
 * ```
 *
 * Grid **detection** is not part of it. The grid is a setting because the user can overrule what
 * detection found — and must, when it found nothing — so resolving it belongs to the tab, and this
 * function is handed the answer. The key colour arrives the same way, from the studio setting the
 * prompt already stated it in.
 *
 * The order is the reason the feature works and the reason it fits on the main thread. Aligning
 * before the palette step stops anti-aliasing fringes claiming palette slots, since a downscaled smooth
 * render is mostly intermediate edge colours by pixel count; and it shrinks the image before the
 * expensive step, so the histogram-and-split runs over tens of thousands of pixels rather than millions.
 *
 * **Keying goes first, ahead of the alignment, and that is not interchangeable.** `alignToGrid`
 * resolves each cell to its modal colour, and on a drifting key field every background pixel is a
 * *distinct* colour polling one vote — so an 8 × 8 cell holding 62 never-repeating magentas and 2
 * pixels of one flat sprite colour resolves entirely to the **sprite**, which dilates the artwork into
 * its own background by up to a whole cell on every side. Keying first collapses that field to one
 * value before the vote, the 62 become 62 votes for the same thing, and the cell resolves to
 * transparent. The step that got the edge wrong gets it right for the same reason.
 *
 * It also means the alignment does most of the edge decontamination for nothing: a one-pixel fringe
 * inside an 8 × 8 cell is 12% of the vote and loses it.
 *
 * Nothing downstream needed changing to accommodate it. `colorHistogram` already excludes fully
 * transparent pixels, so the keyed field claims no palette slots, and `applyPalette` copies it through
 * untouched rather than mapping it onto a colour.
 *
 * Pure, and deliberately so: if a large sheet ever does stall, this moves to a worker unchanged.
 */
export function quantiseImage(image: ImageData, settings: QuantiseSettings): QuantiseResult {
  // `null` skips the pass outright rather than keying against some default colour: the studio's key
  // may be `TRANSPARENT`, which names no colour at all, and the user may simply not have asked.
  const keyed = settings.key === null ? null : keyBackground(image, settings.key);
  const source = keyed?.image ?? image;
  const pixels = image.width * image.height;

  const aligned = alignToGrid(source, settings.grid);
  const reduced = downscaleNearest(aligned, settings.grid);

  // `UNRESTRICTED` with no palette pinned skips the step outright rather than reducing to some
  // generous figure. A painted or 3D-rendered sheet has no colour budget to enforce, and a high cap
  // is still a cap.
  const output = settings.reduction === null ? reduced : reduceColors(reduced, settings.reduction);

  return {
    image: output,
    // The sheet the user dropped, before keying or alignment collapsed anything — otherwise the pair
    // of figures understates the work and the two are not comparable.
    colorsBefore: countColors(image),
    colorsAfter: countColors(output),
    // No zero-pixel guard: `ImageData`'s constructor throws `IndexSizeError` for a zero width or
    // height, so an image with nothing in it cannot reach this line and a division by zero has no way
    // to arise. A guard against it would be a comment claiming to protect against the impossible.
    keyedShare: keyed === null ? 0 : keyed.keyedPixels / pixels,
  };
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
