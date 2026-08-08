import type { QuantiseResult, QuantiseSettings } from '../types/quantiser.ts';
import { applyPalette } from './applyPalette.ts';
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

  // `UNRESTRICTED` skips the palette step outright rather than reducing to some generous figure. A
  // painted or 3D-rendered sheet has no colour budget to enforce, and a high cap is still a cap.
  const output =
    settings.maxColors === null ? reduced : applyPalette(reduced, buildPalette(reduced, settings.maxColors));

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
