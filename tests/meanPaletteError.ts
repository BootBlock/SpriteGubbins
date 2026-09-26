import { colorHistogram, unpackColor } from '../src/utils/imageData.ts';
import { nearestColorSearch } from '../src/utils/nearestColorSearch.ts';
import { srgbToOklab } from '../src/utils/oklab.ts';
import { pixelDistanceOf } from '../src/utils/pixelDistance.ts';
import type { Rgba } from '../src/types/quantiser.ts';

/**
 * How far the average pixel sits from the palette entry it is drawn with, in scaled OKLab: the
 * measure every palette error ladder in the docblocks is stated in.
 *
 * Read off the histogram rather than the pixels, which is cheaper and is also the right
 * question. Cheaper because a colour's distance to its entry is a property of the colour, so the
 * sheet's 1.57 million pixels are 218,978 conversions weighted by their own counts. Right
 * because `colorHistogram` leaves fully transparent pixels out, and those are exactly the pixels
 * `applyPalette` passes through untouched — a mean over the whole field would dilute the error
 * with cleared ground nothing drew an entry on. That is also why `meanCellDistance` in ./cellDistance.ts is
 * not the seam to reach for here: it converts every pixel, so it agrees with this to six
 * decimals on a truecolour sheet and parts company on a keyed one.
 *
 * **The histogram is the unweighted one, deliberately.** `blendWeightedHistogram` decides what a
 * colour is worth while the palette is being *chosen*; this asks what the chosen palette cost
 * the reader, and there every pixel counts once. Conflating the two is what would make the
 * ladder a score the weighting could game.
 *
 * `pixelDistanceOf` rather than a distance spelled here, for the reason its own docblock gives.
 * It measures coverage as a fourth axis, which costs nothing on this reading: the corpus sheets
 * are truecolour, so every colour in the histogram is opaque, and every entry `buildPalette`
 * returns is a colour the sheet holds.
 */
export function meanPaletteError(image: ImageData, palette: readonly Rgba[]): number {
  const nearest = nearestColorSearch(palette);
  let total = 0;
  let pixels = 0;
  for (const [key, count] of colorHistogram(image)) {
    const color = unpackColor(key);
    const entry = nearest(color);
    if (entry === null) throw new Error('an empty palette has no entry to measure against');
    const from = srgbToOklab(color.r, color.g, color.b);
    const to = srgbToOklab(entry.r, entry.g, entry.b);
    total += count * pixelDistanceOf(from.L, from.a, from.b, color.a, to.L, to.a, to.b, entry.a);
    pixels += count;
  }
  return total / pixels;
}
