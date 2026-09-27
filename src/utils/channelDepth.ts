import { channelRungs } from './channelRungs.ts';
import { remapColors } from './imageData.ts';

/**
 * Redrawing an image in a machine's colour space, as opposed to in a fixed list of colours.
 *
 * The sibling of `applyPalette`, and the other half of what a pinned palette can mean: that one maps
 * every pixel onto the nearest of a stated set, this one moves every channel onto the nearest rung
 * `channelLevels` defines. A Mega Drive palette is not a list — it is 512 colours — so the only way
 * to make an image legal for it is to snap the channels.
 *
 * It barely reduces the colour *count*, and that is not what it is for. It makes every colour on the
 * sheet one the machine could actually have displayed.
 */

/**
 * The image with red, green and blue moved to their nearest rung.
 *
 * **Alpha is left exactly as it was**, which `applyRgbPalette` states for the other kind of machine
 * palette and for the same reason: the ladder describes what the machine could *display*, and none
 * of these machines had an alpha channel at all — transparency was one palette entry standing in for
 * "draw nothing". Snapping it would round a partly-transparent edge pixel to opaque or to nothing,
 * which is a decision about the sheet's shape rather than about its colour.
 */
export function snapToChannelDepth(image: ImageData, bitsPerChannel: number): ImageData {
  const snapped = channelRungs(bitsPerChannel);

  // Every channel a canvas holds is an integer 0–255, so the table always answers; the fallbacks are
  // what `noUncheckedIndexedAccess` asks for rather than a case that can arise.
  return remapColors(image, (color) => ({
    r: snapped[color.r] ?? color.r,
    g: snapped[color.g] ?? color.g,
    b: snapped[color.b] ?? color.b,
    a: color.a,
  }));
}
