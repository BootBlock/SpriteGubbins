import { colorHistogram, FULLY_OPAQUE, toHex, unpackColor } from './imageData.ts';
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
 * Fully transparent pixels take no part at all, because `colorHistogram` leaves them out.
 *
 * Pure, as everything in this directory is. The decoding that produces the `ImageData` is the impure
 * half and lives in `src/hooks/`.
 */

/** What an image was found to hold: its colours, or the count that put them out of reach. */
export interface ImagePaletteReading {
  /** The colours as `#RRGGBB`, or `null` where the image holds more than a palette may carry. */
  readonly entries: readonly string[] | null;
  /** How many distinct opaque colours the image holds, whether or not they fit. */
  readonly colors: number;
}

/**
 * The image's colours, or the count of them where there are too many to pin.
 *
 * **Refused rather than truncated**, and the count is why: an image over the ceiling is almost
 * always a sheet dropped where a swatch was meant, and silently keeping the first 256 colours of a
 * sheet would pin a palette the reader never chose while the studio said it was theirs. The caller
 * reports the figure and offers {@link reduceImagePalette}, which is the same choice made
 * deliberately.
 */
export function imagePalette(image: ImageData, max: number): ImagePaletteReading {
  const seen = new Set<number>();

  for (const key of colorHistogram(image).keys()) {
    // The alpha byte off the end of the packing, leaving `0xRRGGBB`.
    seen.add(Math.floor(key / 256));
  }

  const entries = [...seen].map((color) => toHex(unpackColor(color * 256 + FULLY_OPAQUE)));
  return { entries: entries.length > max ? null : entries, colors: entries.length };
}

/**
 * The same image reduced to `max` colours, for the reader who meant to pin a sheet's palette.
 *
 * `buildPalette` is the app's one reducer, so these are the colours the Quantise tab would settle on
 * for the same budget — and every one of them is a colour the image actually contained, never a
 * mean of two. `identityPalette` takes the same route for the same reason.
 *
 * **Ordered by the reduction, not by the image.** There is no author's order left to keep: the
 * colours here are a measurement rather than a list somebody wrote, so they arrive in the order the
 * quantiser settled them.
 */
export function reduceImagePalette(image: ImageData, max: number): readonly string[] {
  return buildPalette(image, max).map(toHex);
}
