import type { Rgba } from '../types/quantiser.ts';
import { remapColors } from './imageData.ts';
import { nearestColorSearch } from './nearestColorSearch.ts';

/**
 * Redrawing an image in a fixed palette.
 *
 * Separate from `buildPalette` in ./wuQuantiser.ts because it is a different algorithm over a
 * different input: the quantiser *chooses* colours from one image, this maps any image onto any
 * palette. The two are used together and neither needs the other to be correct.
 *
 * **Two of them, because a palette can come from two places and they are not the same object.**
 * `buildPalette` returns entries that are real pixels of the image, each carrying the alpha it was
 * found at, so redrawing in one means taking that alpha too. A machine's palette is a list of
 * *colours* — the Game Boy had four shades and no
 * alpha channel at all — so redrawing in one may not touch a pixel's opacity. Both search with
 * `nearestColorSearch`, which is the half that would quietly diverge if they were written twice.
 */

/**
 * The image with every pixel taking its nearest palette entry, by squared distance across all four
 * channels — an opaque pixel choosing among the opaque entries alone.
 *
 * For a palette **derived from this image**, which is what `buildPalette` returns: every entry is a
 * pixel the sheet actually holds, so an entry's opacity is as much a part of it as its hue, and the
 * entry is written whole. That is what keeps the promise the colour count makes — reduce to N and
 * at most N distinct RGBA colours survive. Written whole is also why an opaque pixel may not take a
 * translucent entry, however near its colour: it would leave a hole in the sprite, and
 * `nearestColorSearch` states the rule.
 */
export function applyPalette(image: ImageData, palette: readonly Rgba[]): ImageData {
  // An empty palette means an image with no opaque pixels, none of which reach `resolve` at all.
  const nearest = nearestColorSearch(palette);
  return remapColors(image, (color) => nearest(color) ?? color);
}

/**
 * The image with every pixel taking the nearest palette entry's **colour**, keeping its own alpha.
 *
 * For a palette that states which colours a machine could display. Those entries are opaque by
 * construction — a hex triplet has no fourth channel — so writing them whole would flatten every
 * anti-aliased or soft-keyed edge to fully opaque, putting a hard halo of palette colour where the
 * sprite used to fade out. That is a decision about the sheet's *shape*, which belongs to the keying
 * pass and not to a question about its colour; `snapToChannelDepth` states the same rule for the
 * other kind of machine palette, and the two have to agree or the same sheet keeps its edge under a
 * Mega Drive palette and loses it under a Game Boy one.
 *
 * Alpha plays no part in choosing the entry either, and needs no exclusion to be kept out: every
 * entry is equally opaque, so the alpha term is the same constant for all of them and cannot change
 * which one wins.
 */
export function applyRgbPalette(image: ImageData, palette: readonly Rgba[]): ImageData {
  const nearest = nearestColorSearch(palette);
  return remapColors(image, (color) => ({ ...(nearest(color) ?? color), a: color.a }));
}
