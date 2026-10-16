import type { SheetRegion } from '../types/spriteCell.ts';
import { CHANNELS_PER_PIXEL, createImage, pixelOffset } from './imageData.ts';

/**
 * A region of an image redrawn at another size, each new pixel the average of exactly the source
 * area it covers.
 *
 * **A box filter over exact fractional coverage.** A destination pixel stands for a rectangle of the
 * source `region.width / width` pixels across and `region.height / height` down, which in general
 * starts and ends part of the way through a source pixel. Every source pixel it touches counts by
 * the area of the overlap, so nothing is sampled and nothing is skipped: each source pixel's weight,
 * summed over every destination pixel, is one whole pixel. That is what keeps a fine line from
 * vanishing between samples, which is the failure of nearest and of two-tap bilinear filters at the
 * reductions this is for — a painted icon drawn at 300 pixels brought to 128 is a factor of 2.3.
 *
 * **Exact for whole factors.** At a reduction of 2 every destination pixel is the plain mean of a
 * 2 × 2 block; a flat colour comes back as itself at any factor, because the mean of one colour is
 * that colour. Enlarging is defined too: a destination pixel then covers part of one or two source
 * pixels, which replicates each with a blended seam between them, the honest answer for a sheet
 * drawn smaller than the size asked for.
 *
 * **Averaged in premultiplied alpha.** A transparent pixel's colour channels describe nothing (a keyed
 * field is black or magenta at alpha 0), and averaging them as they stand darkens or tints every edge
 * a sprite has against transparency. So each colour channel is weighted by its own pixel's alpha, and
 * the sum is divided back by the alpha that came through: a red edge half covered comes back red at
 * half alpha, never a darker red. A pixel whose coverage rounds to nothing is written fully transparent,
 * channels and all.
 *
 * **Separable, and deterministic.** The filter is a product of one weight across and one down, so it
 * runs as a pass along each row into a floating-point buffer and then a pass down each column, with
 * no randomness and a fixed summation order: one input always gives one output, which the pack and
 * its tests need.
 *
 * Pure, as everything in this directory is.
 */

/** One destination column's (or row's) source span: the first source index and each one's weight. */
interface Footprint {
  readonly first: number;
  readonly weights: readonly number[];
}

/** What an index past the end of a footprint list reads as: nothing covered. Never reached. */
const EMPTY: Footprint = { first: 0, weights: [] };

/**
 * The source pixels each of `count` destination pixels covers along one axis, and by how much.
 *
 * The bounds are computed as `index * span / count` rather than by stepping a running sum, so a whole
 * factor lands on whole numbers exactly and no rounding error accumulates across a row.
 */
function footprints(start: number, span: number, count: number): readonly Footprint[] {
  return Array.from({ length: count }, (_, index) => {
    const low = (index * span) / count;
    const high = ((index + 1) * span) / count;
    const first = Math.floor(low);
    const weights: number[] = [];
    for (let source = first; source < high; source += 1) {
      weights.push(Math.min(high, source + 1) - Math.max(low, source));
    }
    return { first: start + first, weights };
  });
}

export function resampleArea(
  source: ImageData,
  region: SheetRegion,
  width: number,
  height: number,
): ImageData {
  const across = footprints(region.left, region.width, width);
  const down = footprints(region.top, region.height, height);
  const { data } = source;

  // Along each source row of the region: premultiplied sums per destination column. Index loops
  // rather than iterators, because this is the inner loop of every sprite in a pack.
  const rows = new Float64Array(width * region.height * CHANNELS_PER_PIXEL);
  for (let row = 0; row < region.height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const { first, weights } = across[column] ?? EMPTY;
      const into = (row * width + column) * CHANNELS_PER_PIXEL;
      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 0;
      for (let step = 0; step < weights.length; step += 1) {
        const from = pixelOffset(source.width, first + step, region.top + row);
        const covered = (data[from + 3] ?? 0) * (weights[step] ?? 0);
        red += (data[from] ?? 0) * covered;
        green += (data[from + 1] ?? 0) * covered;
        blue += (data[from + 2] ?? 0) * covered;
        alpha += covered;
      }
      rows.set([red, green, blue, alpha], into);
    }
  }

  // Down each column, then back out of premultiplied alpha.
  const area = (region.width / width) * (region.height / height);
  const output = createImage(width, height);
  for (let y = 0; y < height; y += 1) {
    const { first, weights } = down[y] ?? EMPTY;
    for (let x = 0; x < width; x += 1) {
      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 0;
      for (let step = 0; step < weights.length; step += 1) {
        const from = ((first - region.top + step) * width + x) * CHANNELS_PER_PIXEL;
        const weight = weights[step] ?? 0;
        red += (rows[from] ?? 0) * weight;
        green += (rows[from + 1] ?? 0) * weight;
        blue += (rows[from + 2] ?? 0) * weight;
        alpha += (rows[from + 3] ?? 0) * weight;
      }
      const coverage = Math.round(alpha / area);
      if (coverage === 0) continue;
      output.data.set(
        [Math.round(red / alpha), Math.round(green / alpha), Math.round(blue / alpha), coverage],
        pixelOffset(width, x, y),
      );
    }
  }
  return output;
}
