import { COVERAGE_FLOOR } from '../constants/quantiser.ts';
import { CHANNELS_PER_PIXEL, createImage, FULLY_OPAQUE } from './imageData.ts';

/**
 * The image at one opacity: every pixel at or above {@link COVERAGE_FLOOR} made fully opaque, and
 * every pixel below it cleared.
 *
 * **For a reader asking what colours an image states**, which is a question about colour rather than
 * about a compositing state. Left alone, alpha is one of the four channels a group of colours is
 * split across, so one fill at a dozen edge coverages is a dozen colours to the quantiser and to a
 * histogram — and two entries that differ only in alpha read back as the same hex, a slot spent on
 * nothing. Flattened, every colour appears once, and its pixels total together.
 *
 * **The floor, not zero, decides what is dropped.** A pixel under it carries channels that are the
 * browser's premultiplication rounding rather than a colour, and making it opaque would promote that
 * noise to a colour at full weight. It is cleared to `{0, 0, 0, 0}`, which is what `colorHistogram`
 * and every colour transform already leave out.
 *
 * Pure: a fresh image, the input untouched.
 */
export function flattenOpacity(image: ImageData): ImageData {
  const output = createImage(image.width, image.height);
  const { data } = image;
  for (let offset = 0; offset < data.length; offset += CHANNELS_PER_PIXEL) {
    // `createImage` zero-fills, so a pixel under the floor is cleared by writing nothing.
    if ((data[offset + 3] ?? 0) < COVERAGE_FLOOR) continue;
    output.data[offset] = data[offset] ?? 0;
    output.data[offset + 1] = data[offset + 1] ?? 0;
    output.data[offset + 2] = data[offset + 2] ?? 0;
    output.data[offset + 3] = FULLY_OPAQUE;
  }
  return output;
}
