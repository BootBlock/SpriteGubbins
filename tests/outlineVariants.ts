import {
  extremeNeighbours,
  TRANSPARENT_DILATE_KEY,
  TRANSPARENT_ERODE_KEY,
} from '../src/utils/extremeNeighbour.ts';
import {
  alphaAt,
  CHANNELS_PER_PIXEL,
  copyPixel,
  createImage,
  FULLY_TRANSPARENT,
  pixelOffset,
} from '../src/utils/imageData.ts';
import { lumaOfChannels } from '../src/utils/lineVote.ts';
import { outlinePolarity, polarityAt, type PolarityField } from '../src/utils/outlinePolarity.ts';

/**
 * The two variants of the outline-expansion pass the docblocks measure and the app does not ship,
 * rebuilt from the shipped parts so `tests/quantiser-figures-outline-expansion.test.ts` can pin
 * both halves of each comparison.
 *
 * Each is checked there against the shipped pass: {@link expandWith} over the shipped field must
 * reproduce `outlineExpansion` byte for byte, and the ground-term field at a weight of 0 against 1
 * is the shipped field. A variant that drifted from the pass it varies would be measuring something
 * else, which is the one way these figures could be right about the wrong question.
 */

/** Every pixel's lightness, with `absent` wherever the pixel is fully transparent. */
function lightnessKeys(image: ImageData, absent: number): Int16Array {
  const { data } = image;
  const keys = new Int16Array(image.width * image.height);
  for (let pixel = 0; pixel < keys.length; pixel += 1) {
    const at = pixel * CHANNELS_PER_PIXEL;
    keys[pixel] =
      alphaAt(data, at) === FULLY_TRANSPARENT
        ? absent
        : lumaOfChannels(data[at] ?? 0, data[at + 1] ?? 0, data[at + 2] ?? 0);
  }
  return keys;
}

/** Each opaque pixel's colour taken whole from the pixel `winners` names, its own coverage kept. */
function writeWinner(image: ImageData, output: ImageData, pixel: number, winner: number): void {
  const at = pixel * CHANNELS_PER_PIXEL;
  const from = winner * CHANNELS_PER_PIXEL;
  output.data[at] = image.data[from] ?? 0;
  output.data[at + 1] = image.data[from + 1] ?? 0;
  output.data[at + 2] = image.data[from + 2] ?? 0;
  output.data[at + 3] = image.data[at + 3] ?? 0;
}

/** Whole-pixel erosion (`takeMin`) or dilation over a `(2 × radius + 1)` square, alpha untouched. */
function morph(image: ImageData, radius: number, takeMin: boolean): ImageData {
  const output = createImage(image.width, image.height);
  const keys = lightnessKeys(image, takeMin ? TRANSPARENT_ERODE_KEY : TRANSPARENT_DILATE_KEY);
  const winners = extremeNeighbours(keys, image.width, image.height, radius, takeMin);
  for (let pixel = 0; pixel < winners.length; pixel += 1) {
    if (alphaAt(image.data, pixel * CHANNELS_PER_PIXEL) === FULLY_TRANSPARENT) {
      copyPixel(image.data, output.data, pixel * CHANNELS_PER_PIXEL);
    } else {
      writeWinner(image, output, pixel, winners[pixel] ?? pixel);
    }
  }
  return output;
}

/** The shipped pass's expansion, steered by whatever polarity field it is handed. */
export function expandWith(image: ImageData, field: PolarityField, thickness: number): ImageData {
  const eroded = morph(image, thickness, true);
  const dilated = morph(image, thickness, false);
  const output = createImage(image.width, image.height);
  for (let pixel = 0; pixel < image.width * image.height; pixel += 1) {
    const at = pixel * CHANNELS_PER_PIXEL;
    const x = pixel % image.width;
    const grown = polarityAt(field, x, (pixel - x) / image.width) >= 0 ? eroded : dilated;
    copyPixel(alphaAt(image.data, at) === FULLY_TRANSPARENT ? image.data : grown.data, output.data, at);
  }
  return output;
}

/**
 * PixelOE's opening-then-closing tail, `erode(t)`, `dilate(2t)`, `erode(t)` over the whole sheet,
 * with the two dilations run as one at twice the radius as the reference does.
 */
export function openCloseTail(image: ImageData, thickness: number): ImageData {
  return morph(morph(morph(image, thickness, true), 2 * thickness, false), thickness, true);
}

/** The lower median of the opaque lightness in the window `outlinePolarity` reads its ground from. */
function windowMedian(image: ImageData, block: number, column: number, row: number): number {
  const origin = (block - 1) >> 1;
  const centreX = column * block + origin;
  const centreY = row * block + origin;
  const tones: number[] = [];
  for (let y = Math.max(centreY - block, 0); y <= Math.min(centreY + block, image.height - 1); y += 1) {
    for (let x = Math.max(centreX - block, 0); x <= Math.min(centreX + block, image.width - 1); x += 1) {
      const at = pixelOffset(image.width, x, y);
      if (alphaAt(image.data, at) === FULLY_TRANSPARENT) continue;
      tones.push(lumaOfChannels(image.data[at] ?? 0, image.data[at + 1] ?? 0, image.data[at + 2] ?? 0));
    }
  }
  tones.sort((a, b) => a - b);
  return tones[(tones.length - 1) >> 1] ?? Number.NaN;
}

/**
 * The polarity field with PixelOE's ground term restored:
 * `ground × (median − 127.5) + reach × ((median − min) − (max − median))`, where the second bracket
 * is the shipped score itself.
 */
export function groundTermField(
  image: ImageData,
  block: number,
  ground: number,
  reach: number,
): PolarityField {
  const shipped = outlinePolarity(image, block);
  const scores = new Float32Array(shipped.scores.length);
  for (let row = 0; row < shipped.rows; row += 1) {
    for (let column = 0; column < shipped.columns; column += 1) {
      const point = row * shipped.columns + column;
      const score = shipped.scores[point] ?? Number.NaN;
      scores[point] = Number.isNaN(score)
        ? Number.NaN
        : ground * (windowMedian(image, block, column, row) - 127.5) + reach * score;
    }
  }
  return { ...shipped, scores };
}

/** The share of the opaque pixels, in per cent, that `field` sends to the bright side. */
export function brightSideShare(image: ImageData, field: PolarityField): number {
  let bright = 0;
  let opaque = 0;
  for (let pixel = 0; pixel < image.width * image.height; pixel += 1) {
    if (alphaAt(image.data, pixel * CHANNELS_PER_PIXEL) === FULLY_TRANSPARENT) continue;
    opaque += 1;
    const x = pixel % image.width;
    if (polarityAt(field, x, (pixel - x) / image.width) < 0) bright += 1;
  }
  return (100 * bright) / opaque;
}
