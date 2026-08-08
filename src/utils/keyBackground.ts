import { FRINGE_TOLERANCE_FACTOR } from '../constants/quantiser.ts';
import type { BackgroundKeying, Rgba } from '../types/quantiser.ts';
import { CHANNELS_PER_PIXEL, createImage, FULLY_TRANSPARENT, readPixel, writePixel } from './imageData.ts';

/**
 * Turning a returned sheet's background key into transparency.
 *
 * The template's section 0 asks for a uniform key field filling all space between components, and a
 * generative raster does not have a flat-fill operation: the sheet that prompted this feature came
 * back *visibly* magenta and almost nowhere actually `#FF00FF`, the values drifting across the whole
 * field, and any lossy re-encode on the way out moves them again. So an exact match keys nothing, and
 * the field has to be matched as a neighbourhood.
 *
 * That leaves the second half of the problem, which is why this is not a one-line threshold: an
 * anti-aliased silhouette **blends the key colour into the artwork beside it**, so a field removed
 * exactly leaves a halo one to three pixels wide. A halo is worse than an unkeyed sheet, because it is
 * now baked into a file the user believes is clean.
 *
 * Pure, and deliberately so — no canvas, no store, one `ImageData` in and another out. `quantiseImage`
 * runs this **first**, before `alignToGrid`, and that ordering is load-bearing; the reasoning is there.
 */

/** The keyed image, and how much of it the key accounted for. */
export interface KeyedImage {
  readonly image: ImageData;
  /**
   * Pixels that arrived carrying *some* colour — any alpha above zero — and left fully transparent.
   *
   * Not simply "transparent pixels in the output": a sheet that already carried empty space would
   * inflate that figure with area the key never touched, and the number exists to answer whether the
   * *key* matched. The threshold is at zero rather than at full opacity because a partly-transparent
   * pixel is still something the key removed.
   */
  readonly keyedPixels: number;
}

/**
 * The image with its key field — and the fringe of blends around it — replaced by transparency.
 *
 * Two passes with a mask between them, and the mask is the whole reason it is two:
 *
 * 1. **The field.** A pixel within `tolerance` of the key colour, or already fully transparent, is
 *    marked. Nothing is written yet.
 * 2. **The fringe, and the output.** A marked pixel becomes transparent. An *unmarked* pixel becomes
 *    transparent too if it is 4-adjacent to a marked one and within
 *    `tolerance × FRINGE_TOLERANCE_FACTOR` of the key. Everything else is copied through untouched.
 *
 * **Pass 2 reads the mask, never its own output**, so the erosion is exactly one pixel deep and cannot
 * cascade. That bound is the point: the same rule applied to its own results is a flood fill, and it
 * would walk straight down a gradient until the sprite ran out. One pixel is also what anti-aliasing
 * on a downscaled render actually produces at the scale the grid step then votes over.
 *
 * The adjacency requirement is what makes the wider fringe threshold safe — see
 * `FRINGE_TOLERANCE_FACTOR`. And because that threshold is scaled from `tolerance` rather than being a
 * control of its own, a tolerance of 0 makes pass 2 unreachable by construction: the only pixels
 * within a zero-radius fringe are exact matches, which pass 1 has already marked.
 *
 * **Keyed pixels are written `{0, 0, 0, 0}`, not their original RGB at zero alpha.** This is not
 * tidiness. `alignToGrid` resolves each cell to its modal *packed RGBA*, so transparent pixels that
 * kept different RGB values are still different colours to that vote — and collapsing the drifting
 * field into one value before the vote is taken is the entire reason keying runs first.
 */
export function keyBackground(image: ImageData, { color, tolerance }: BackgroundKeying): KeyedImage {
  const { width, height, data } = image;
  const pixels = width * height;

  // Squared, so every comparison below stays in integers and no square root is taken 16 million times.
  const fieldRadius = tolerance * tolerance;
  const fringeRadius = (tolerance * FRINGE_TOLERANCE_FACTOR) ** 2;

  const field = new Uint8Array(pixels);
  for (let index = 0; index < pixels; index += 1) {
    const pixel = readPixel(data, index * CHANNELS_PER_PIXEL);
    // Already-transparent pixels join the field rather than being left out of it: an empty region is
    // an empty region however it got that way, and the fringe around one is contaminated the same way.
    if (pixel.a === FULLY_TRANSPARENT || rgbDistanceSquared(pixel, color) <= fieldRadius) {
      field[index] = 1;
    }
  }

  const output = createImage(width, height);
  let keyedPixels = 0;

  for (let index = 0; index < pixels; index += 1) {
    const offset = index * CHANNELS_PER_PIXEL;
    const pixel = readPixel(data, offset);
    const isKeyed =
      field[index] === 1 ||
      // Adjacency first, and deliberately: it fails for every interior pixel, which is nearly all of
      // them, and it fails on four array reads rather than three multiplications.
      (touchesField(field, width, height, index) && rgbDistanceSquared(pixel, color) <= fringeRadius);

    if (!isKeyed) {
      writePixel(output.data, offset, pixel);
      continue;
    }

    // Nothing is written for a keyed pixel: `createImage` zero-fills, which is exactly the canonical
    // `{0, 0, 0, 0}` the modal vote downstream depends on.
    if (pixel.a !== FULLY_TRANSPARENT) keyedPixels += 1;
  }

  return { image: output, keyedPixels };
}

/** Squared distance across RGB alone — the restriction of `nearestColor`'s metric to the three channels a key field has. */
function rgbDistanceSquared(color: Rgba, key: Rgba): number {
  const r = color.r - key.r;
  const g = color.g - key.g;
  const b = color.b - key.b;
  return r * r + g * g + b * b;
}

/**
 * Whether any of a pixel's four orthogonal neighbours is part of the field.
 *
 * 4-adjacency rather than 8: a diagonal neighbour touches at a corner, and a corner contact is not
 * where a blend comes from. Edge pixels simply have fewer neighbours to ask — the bounds checks are
 * what stop a row wrapping onto the one above it, which would erode a stripe down the opposite margin.
 */
function touchesField(field: Uint8Array, width: number, height: number, index: number): boolean {
  const x = index % width;
  const y = (index - x) / width;

  return (
    (x > 0 && field[index - 1] === 1) ||
    (x < width - 1 && field[index + 1] === 1) ||
    (y > 0 && field[index - width] === 1) ||
    (y < height - 1 && field[index + width] === 1)
  );
}
