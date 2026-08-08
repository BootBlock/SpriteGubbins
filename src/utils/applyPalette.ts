import { RGBA_CHANNELS } from '../types/quantiser.ts';
import type { Rgba } from '../types/quantiser.ts';
import { remapColors } from './imageData.ts';

/**
 * Redrawing an image in a fixed palette.
 *
 * Separate from `buildPalette` in ./medianCut.ts because it is a different algorithm over a
 * different input: median cut *chooses* colours from one image, this maps any image onto any
 * palette. The two are used together and neither needs the other to be correct.
 *
 * **Two of them, because a palette can come from two places and they are not the same object.**
 * Median cut returns entries with an alpha it split the image on, so redrawing in one means taking
 * that alpha too. A machine's palette is a list of *colours* — the Game Boy had four shades and no
 * alpha channel at all — so redrawing in one may not touch a pixel's opacity. Both share
 * `nearestColor`, which is the half that would quietly diverge if they were written twice.
 */

/**
 * The image with every pixel taking its nearest palette entry, by squared distance across all four
 * channels.
 *
 * For a palette **derived from this image**, which is what `buildPalette` returns: alpha is one of
 * the four channels it split on, so an entry's opacity is as much a part of it as its hue, and the
 * entry is written whole. That is what keeps the promise the colour count makes — reduce to N and
 * exactly N distinct RGBA colours survive.
 */
export function applyPalette(image: ImageData, palette: readonly Rgba[]): ImageData {
  // An empty palette means an image with no opaque pixels, none of which reach `resolve` at all.
  return remapColors(image, (color) => nearestColor(color, palette) ?? color);
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
  return remapColors(image, (color) => ({ ...(nearestColor(color, palette) ?? color), a: color.a }));
}

/**
 * The palette entry closest to a colour, the earliest entry taking a tie.
 *
 * Exported because "which palette entry does this colour belong to" is asked three times: by the two
 * functions above, to redraw a pixel, and by `identityPalette`, to total how much of the image each
 * entry speaks for. Three distance loops would be three answers to one question, and the tie-break
 * is the half that would quietly diverge.
 */
export function nearestColor(color: Rgba, palette: readonly Rgba[]): Rgba | null {
  let chosen: Rgba | null = null;
  let shortest = Infinity;

  for (const candidate of palette) {
    let distance = 0;
    for (const channel of RGBA_CHANNELS) {
      const delta = color[channel] - candidate[channel];
      distance += delta * delta;
    }
    if (distance < shortest) {
      shortest = distance;
      chosen = candidate;
    }
  }

  return chosen;
}
