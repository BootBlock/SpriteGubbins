import type { ThresholdMatrix } from '../types/quantiser.ts';
import { channelLevels } from './channelLevels.ts';
import { CHANNELS_PER_PIXEL, FULLY_TRANSPARENT, alphaAt, copyPixel, createImage } from './imageData.ts';
import { srgbToLinear } from './oklab.ts';

/**
 * The classic ordered dither for a bit-depth reduction: each channel thresholded on its own against
 * one tile, between the rung at or below it and the rung above.
 *
 * A channel-depth space is the uniform lattice ordered dithering was defined for, so it needs none
 * of the search `mixingPlan` makes for a list palette. **Each channel takes its own fraction and all
 * three share the pixel's one rank**, which is what lets a pixel move up to four corners of its cell
 * across a tile: the colour steps along a chain of corners, one channel's threshold at a time, where
 * a mixture of two corners can only move along the line between them. It is also what keeps a grey
 * neutral with no special case: its three fractions are equal, so its three channels cross their
 * thresholds at the same ranks and every pixel stays on the diagonal.
 *
 * **The fraction is taken in linear light**, for the reason `mixingPlan` gives for its mixture: the
 * eye averages the light alternating pixels emit, and a fraction taken in sRGB would leave every
 * dithered mid-tone darker than the colour it stands for.
 *
 * It replaced a two-corner mixing plan searched per distinct colour, and the two machine rows of
 * `DITHER_CHOICES`'s table are what it measures on the reference sheet. **It costs O(pixels)**: three
 * table reads a pixel, where the search grew with the sheet's distinct colours, of which a grid of 1
 * leaves the reference sheet 218,978.
 *
 * Alpha is left as it arrived and a fully transparent pixel is copied through, as
 * `snapToChannelDepth` leaves both — none of these machines had a fourth channel to reduce.
 */
export function ditherChannelDepth(
  image: ImageData,
  bitsPerChannel: number,
  matrix: ThresholdMatrix,
): ImageData {
  const { below, above, steps } = thresholdTable(channelLevels(bitsPerChannel), matrix.levels);
  const output = createImage(image.width, image.height);
  const { data } = image;

  for (let y = 0; y < image.height; y += 1) {
    const row = (y % matrix.size) * matrix.size;
    for (let x = 0; x < image.width; x += 1) {
      const offset = (y * image.width + x) * CHANNELS_PER_PIXEL;
      if (alphaAt(data, offset) === FULLY_TRANSPARENT) {
        copyPixel(data, output.data, offset);
        continue;
      }

      const rank = matrix.ranks[row + (x % matrix.size)] ?? 0;
      for (let channel = 0; channel < 3; channel += 1) {
        const value = data[offset + channel] ?? 0;
        output.data[offset + channel] =
          rank < (steps[value] ?? 0) ? (above[value] ?? 0) : (below[value] ?? 0);
      }
      output.data[offset + 3] = data[offset + 3] ?? 0;
    }
  }

  return output;
}

/**
 * For each of the 256 channel values: the rung at or below it, the rung above, and how many of the
 * tile's `levels` ranks take the upper one.
 *
 * Resolved per channel *value* rather than per colour, as `snapToChannelDepth` resolves its own
 * table: 256 entries answer for every colour there is, which is what makes the pass O(pixels)
 * whatever the sheet's colour count. A value on a rung is its own rung both ways and takes no step.
 */
function thresholdTable(
  rungs: readonly number[],
  levels: number,
): { below: Uint8Array; above: Uint8Array; steps: Uint16Array } {
  const below = new Uint8Array(256);
  const above = new Uint8Array(256);
  const steps = new Uint16Array(256);

  for (let value = 0; value < 256; value += 1) {
    let lower = rungs[0] ?? 0;
    let upper = rungs[rungs.length - 1] ?? 255;
    for (const rung of rungs) {
      if (rung <= value && rung >= lower) lower = rung;
      if (rung >= value && rung <= upper) upper = rung;
    }
    below[value] = lower;
    above[value] = upper;
    if (lower === upper) continue;

    const floor = srgbToLinear(lower);
    const fraction = (srgbToLinear(value) - floor) / (srgbToLinear(upper) - floor);
    steps[value] = Math.round(fraction * levels);
  }

  return { below, above, steps };
}
