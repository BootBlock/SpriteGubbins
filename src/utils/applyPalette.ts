import { RGBA_CHANNELS } from '../types/quantiser.ts';
import type { Rgba } from '../types/quantiser.ts';
import {
  CHANNELS_PER_PIXEL,
  createImage,
  FULLY_TRANSPARENT,
  packColor,
  readPixel,
  writePixel,
} from './imageData.ts';

/**
 * Redrawing an image in a fixed palette.
 *
 * Separate from `buildPalette` in ./medianCut.ts because it is a different algorithm over a
 * different input: median cut *chooses* colours from one image, this maps any image onto any
 * palette. The two are used together and neither needs the other to be correct.
 */

/**
 * The image with every pixel taking its nearest palette entry, by squared distance across all four
 * channels.
 *
 * **Fully transparent pixels are copied through untouched** and never consult the palette, matching
 * the histogram that excluded them: an empty field describes nothing, and mapping it to a palette
 * entry would put a colour where the sheet says there is none.
 *
 * Distances are resolved once per distinct colour rather than once per pixel — the difference
 * between a few thousand comparisons and a few million on a sheet with far fewer colours than pixels.
 */
export function applyPalette(image: ImageData, palette: readonly Rgba[]): ImageData {
  const output = createImage(image.width, image.height);
  const resolved = new Map<number, Rgba>();

  for (let offset = 0; offset < image.data.length; offset += CHANNELS_PER_PIXEL) {
    const color = readPixel(image.data, offset);
    if (color.a === FULLY_TRANSPARENT) {
      writePixel(output.data, offset, color);
      continue;
    }

    const key = packColor(color);
    let mapped = resolved.get(key);
    if (mapped === undefined) {
      // An empty palette means an image with no opaque pixels, none of which reach this line.
      mapped = nearestColor(color, palette) ?? color;
      resolved.set(key, mapped);
    }
    writePixel(output.data, offset, mapped);
  }

  return output;
}

/**
 * The palette entry closest to a colour, the earliest entry taking a tie.
 *
 * Exported because "which palette entry does this colour belong to" is asked twice: here, to redraw
 * a pixel, and by `identityPalette`, to total how much of the image each entry speaks for. Two
 * distance loops would be two answers to one question, and the tie-break is the half that would
 * quietly diverge.
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
