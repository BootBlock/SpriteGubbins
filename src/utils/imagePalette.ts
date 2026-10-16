import { flattenOpacity } from './flattenOpacity.ts';
import {
  alphaAt,
  CHANNELS_PER_PIXEL,
  FULLY_TRANSPARENT,
  packedColorAt,
  toHex,
  unpackColor,
} from './imageData.ts';
import { buildPalette } from './wuQuantiser.ts';

/**
 * The colours a picture states, for a reader pinning a palette they already have as an image.
 *
 * **In the order the image shows them**, which is the whole difference from `paletteEntriesFrom`
 * one file over. That reads a *sheet* and answers "which colours is this mostly made of", so it
 * orders by population. This reads a *swatch*, where the author's order is the information: a ramp
 * runs dark to light, and re-sorting it by how many pixels each block happens to cover would hand
 * the reader back their own palette shuffled. `swatchImage` writes solid adjacent blocks, so a
 * palette this app exported comes back exactly as it left.
 *
 * **Deduplicated across alpha, and returned opaque**, for the reason `paletteEntriesFrom` is: a
 * palette is a statement about colour, and the same fill at a dozen edge coverages is one colour.
 * Both readings flatten the image first with `flattenOpacity`, so a pixel under the coverage floor —
 * whose channels are rounding noise — takes no part at all.
 *
 * Pure, as everything in this directory is. The decoding that produces the `ImageData` is the impure
 * half and lives in `src/hooks/`, and both readings run on `paletteReadWorker`'s thread rather than
 * the tab's: a reduction of a large sheet takes seconds.
 */

/**
 * The image's colours, or `null` where there are more than `max` of them.
 *
 * **Refused rather than truncated**: an image over the ceiling is almost always a sheet dropped
 * where a swatch was meant, and silently keeping the first 256 colours of a sheet would pin a
 * palette the reader never chose while the studio said it was theirs. The caller says so and offers
 * {@link reduceImagePalette}, which is the same choice made deliberately.
 *
 * **It stops counting at the first colour past `max`.** The refusal needs to know only that the
 * image is over, and a full count of an anti-aliased sheet is a set of millions — measured at 9.5
 * seconds for a random 4096² image, against a flattening pass that is linear and cheap. So nothing
 * reports how far over an image was, because finding out is the whole cost.
 */
export function imagePalette(image: ImageData, max: number): readonly string[] | null {
  // Flattened, every pixel left is one opaque colour, so a packed key is one per colour.
  const { data } = flattenOpacity(image);
  const colors = new Set<number>();
  for (let offset = 0; offset < data.length; offset += CHANNELS_PER_PIXEL) {
    if (alphaAt(data, offset) === FULLY_TRANSPARENT) continue;
    colors.add(packedColorAt(data, offset));
    if (colors.size > max) return null;
  }
  // A `Set` keeps insertion order, which is the scan order, which is the author's order.
  return [...colors].map((key) => toHex(unpackColor(key)));
}

/**
 * The same image reduced to `max` colours, for the reader who meant to pin a sheet's palette.
 *
 * `buildPalette` is the app's one reducer, so these are the colours the Quantise tab would settle on
 * for the same budget — and every one of them is a colour the image actually contained, never a
 * mean of two. `identityPalette` takes the same route for the same reason.
 *
 * **Flattened before it is reduced**, because `toHex` drops alpha: two entries the quantiser split on
 * opacity alone, one fill at two coverages, would come back as the same hex, and a reader asking
 * for two colours would be handed one twice.
 *
 * **Ordered by the reduction, not by the image.** There is no author's order left to keep: the
 * colours here are a measurement rather than a list somebody wrote, so they arrive in the order the
 * quantiser settled them.
 */
export function reduceImagePalette(image: ImageData, max: number): readonly string[] {
  return buildPalette(flattenOpacity(image), max).map(toHex);
}
