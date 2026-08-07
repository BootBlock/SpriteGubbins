import type { QuantiseResult, QuantiseSettings } from '../types/quantiser.ts';
import { applyPalette } from './applyPalette.ts';
import { alignToGrid, downscaleNearest } from './gridAlignment.ts';
import { countColors } from './imageData.ts';
import { buildPalette } from './medianCut.ts';

/**
 * The whole pipeline: align, downscale, reduce.
 *
 * ```
 * ImageData  →  alignToGrid  →  downscaleNearest  →  applyPalette  →  ImageData
 *               (cells become    (one pixel per      (palette
 *                one colour)      cell, exact)        reduction)
 * ```
 *
 * Grid **detection** is not part of it. The grid is a setting because the user can overrule what
 * detection found — and must, when it found nothing — so resolving it belongs to the tab, and this
 * function is handed the answer.
 *
 * The order is the reason the feature works and the reason it fits on the main thread. Aligning
 * first stops anti-aliasing fringes claiming palette slots, since a downscaled smooth render is
 * mostly intermediate edge colours by pixel count; and it shrinks the image before the expensive
 * step, so the histogram-and-split runs over tens of thousands of pixels rather than millions.
 *
 * Pure, and deliberately so: if a large sheet ever does stall, this moves to a worker unchanged.
 */
export function quantiseImage(image: ImageData, settings: QuantiseSettings): QuantiseResult {
  const aligned = alignToGrid(image, settings.grid);
  const reduced = downscaleNearest(aligned, settings.grid);

  // `UNRESTRICTED` skips the palette step outright rather than reducing to some generous figure. A
  // painted or 3D-rendered sheet has no colour budget to enforce, and a high cap is still a cap.
  const output =
    settings.maxColors === null ? reduced : applyPalette(reduced, buildPalette(reduced, settings.maxColors));

  return {
    image: output,
    colorsBefore: countColors(image),
    colorsAfter: countColors(output),
  };
}
