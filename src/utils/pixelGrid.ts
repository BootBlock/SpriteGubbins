import { GRID_DETECTION_THRESHOLD, MAX_DETECTED_GRID } from '../constants/quantiser.ts';
import type { PixelGrid } from '../types/quantiser.ts';
import { packColor, pixelOffset, readPixel } from './imageData.ts';

/**
 * Finding the scale a returned sheet's art was actually drawn at.
 *
 * A question about an image, not a transform of one — snapping to the answer and reducing to it are
 * `alignToGrid` and `downscaleNearest` in ./gridAlignment.ts, and `quantiseImage` is what runs the
 * three in order.
 */

/**
 * The pixel scale the image was drawn at, or `null` when it has none.
 *
 * Largest candidate first, because a true grid of 8 also scores perfectly at 4, 2 and 1 — the
 * coarsest grid that holds is the real one. Exact equality rather than a tolerance, because a
 * tolerance turns a near-flat gradient into a false grid, and `alignToGrid` immediately after is
 * what handles cells that are imperfect.
 *
 * `null` is the honest answer for genuinely smooth artwork, and a useful one: it says the model
 * returned a painted image rather than pixel art at a scale, and the tab then asks for a grid
 * instead of guessing. Candidates stop at 2 because every image is trivially uniform at 1, so a
 * detector that considered it could never answer `null`.
 */
export function detectPixelGrid(image: ImageData): PixelGrid | null {
  for (let grid = MAX_DETECTED_GRID; grid >= 2; grid -= 1) {
    if (gridHolds(image, grid)) return grid;
  }
  return null;
}

/** Whether enough whole `grid × grid` blocks are a single colour for this scale to be believed. */
function gridHolds(image: ImageData, grid: PixelGrid): boolean {
  const columns = Math.floor(image.width / grid);
  const rows = Math.floor(image.height / grid);
  // A grid larger than the image has no whole block to judge, so there is nothing to believe.
  if (columns === 0 || rows === 0) return false;

  // Trailing partial blocks are not scored: one the image cut short is evidence either way, and
  // counting it would penalise every scale that does not divide the canvas exactly.
  const blocks = columns * rows;
  let uniform = 0;
  let scanned = 0;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (isCellUniform(image, column * grid, row * grid, grid)) uniform += 1;
      scanned += 1;

      // Stop once a perfect run through the rest could no longer reach the threshold — otherwise
      // detection is up to 31 full passes over a multi-megapixel sheet. This is the verdict's own
      // comparison applied optimistically, so it can only save time. A budget of "allowed failures"
      // cannot promise that: `blocks * (1 - 0.9)` is a hair under a tenth in binary floating point,
      // so a grid scoring *exactly* the threshold would be thrown away by the optimisation.
      if ((uniform + blocks - scanned) / blocks < GRID_DETECTION_THRESHOLD) return false;
    }
  }

  return uniform / blocks >= GRID_DETECTION_THRESHOLD;
}

/** Whether every pixel of one whole block is the same colour, alpha included. */
function isCellUniform(image: ImageData, left: number, top: number, grid: PixelGrid): boolean {
  const first = packColor(readPixel(image.data, pixelOffset(image.width, left, top)));
  for (let y = top; y < top + grid; y += 1) {
    for (let x = left; x < left + grid; x += 1) {
      if (packColor(readPixel(image.data, pixelOffset(image.width, x, y))) !== first) return false;
    }
  }
  return true;
}
