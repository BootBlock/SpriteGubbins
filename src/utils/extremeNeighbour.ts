import { type ExtremumField, extremumScratch, runningExtremum } from './runningExtremum.ts';

/**
 * The lightness key a fully transparent pixel is given while a **minimum** is being taken: one step
 * above the brightest a real pixel can be, so it loses every comparison including the tie-break.
 *
 * Outside the 0–255 range rather than at its edge, and that is load-bearing. A pure-white sprite
 * pixel reads 255; an identity of 255 would tie with it, and the tie-break — lowest index wins —
 * would hand the neighbourhood to whichever of the two happened to sit earlier in the sheet.
 */
export const TRANSPARENT_ERODE_KEY = 256;

/** The mirror of {@link TRANSPARENT_ERODE_KEY} for a **maximum**: one step below the darkest real pixel. */
export const TRANSPARENT_DILATE_KEY = -1;

/**
 * For every pixel, which pixel in its square neighbourhood is the darkest — or the lightest.
 *
 * This is a **flat greyscale morphology** whose structuring element is a `(2 × radius + 1)` square,
 * and whose answer is an *index* rather than a value: erosion hands back the position of the
 * darkest neighbour, dilation the position of the lightest. What the caller does with that position
 * is its business; `outlineExpansion.ts` reads the whole pixel there.
 *
 * **An index, and not a per-channel minimum, is the whole point.** OpenCV's `erode` on a colour
 * image — which is what the reference implementation this pass is ported from calls — takes the
 * minimum of each channel independently, so its output holds colours assembled from three different
 * pixels: a red from here, a green from there. That is harmless where the result is about to be
 * resampled, and not harmless here, because the Quantise panel tells the reader in as many words
 * that under the standard vote every colour which survives is one the image already contained. An
 * index cannot break that promise. It also keeps the palette step honest — a budget chosen from
 * invented tones spends slots on colours the artist never drew.
 *
 * **Separable, because a square is.** The minimum over a square is the minimum over one axis of the
 * minima over the other, so two one-dimensional passes give the two-dimensional answer — and each
 * of those is constant-time per pixel however wide the window (see `runningExtremum.ts`). The
 * composition is exact for the *index* too, not merely for the value, because the tie-break is
 * "lowest index wins" at every stage: each row hands up its leftmost winner, and the column then
 * takes the topmost of those, which is the first winner in row-major order — exactly what a
 * brute-force walk of the square would return. `extremeNeighbour.test.ts` pins that against one.
 *
 * **Transparent pixels are given the operation's identity element**, `TRANSPARENT_ERODE_KEY` for
 * the minimum and `TRANSPARENT_DILATE_KEY` for the maximum, both outside the 0–255 range a real
 * lightness can occupy. So a cleared pixel can never win a neighbourhood, cannot tie with a real
 * one, and the artwork neither grows into the keyed field nor takes its undefined bytes. Both
 * sentinels are strictly outside the range rather than at its edge, which is what makes the "cannot
 * tie" half true: a pure-white sprite pixel reads 255, and an identity of 255 would let a cleared
 * neighbour beat it on the index tie-break.
 *
 * **Cost.** Time is linear in the pixel count and flat in the radius — measured, the caller's pass
 * takes the same time at a radius of 4 as at 1. Being linear in the pixels is the figure to hold on
 * to, because it is not small: the 4096² ceiling `MAX_IMAGE_PIXELS` admits is eleven times the
 * reference sheet, and the pass measured about twelve times as long there. Memory is twelve bytes
 * per pixel of working buffers, freed on return — nineteen megabytes on a 1254² sheet and 201 at the
 * ceiling. None of it hangs the page, because the whole pipeline is on a worker behind a spinner and
 * `quantiseSession` supersedes a job nobody is waiting for; it is a reason the dial opens off, not a
 * reason to guard it.
 *
 * Pure: it reads the keys it is handed and allocates everything else itself.
 */
export function extremeNeighbours(
  keys: Int16Array,
  width: number,
  height: number,
  radius: number,
  takeMin: boolean,
): Int32Array {
  const pixels = width * height;

  // The first pass's owners are the identity — every pixel stands for itself — and the buffer is
  // reused for the second pass's output, which reads a different one.
  const owners = new Int32Array(pixels);
  for (let index = 0; index < pixels; index += 1) owners[index] = index;

  const source: ExtremumField = { keys, owners };
  const rowWise: ExtremumField = {
    keys: new Int16Array(pixels),
    owners: new Int32Array(pixels),
  };
  const squareWise: ExtremumField = { keys: new Int16Array(pixels), owners };

  const scratch = extremumScratch(Math.max(width, height));

  for (let y = 0; y < height; y += 1) {
    runningExtremum(
      source,
      rowWise,
      { start: y * width, stride: 1, length: width },
      radius,
      takeMin,
      scratch,
    );
  }

  for (let x = 0; x < width; x += 1) {
    runningExtremum(
      rowWise,
      squareWise,
      { start: x, stride: width, length: height },
      radius,
      takeMin,
      scratch,
    );
  }

  return squareWise.owners;
}
