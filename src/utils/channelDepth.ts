import { channelLevels } from './channelLevels.ts';
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
  const levels = channelLevels(bitsPerChannel);
  // Resolved per channel *value* rather than per colour, which `remapColors`'s own memo cannot do:
  // 256 entries answer for every colour there is, and the table does not depend on the image.
  const snapped = Array.from({ length: 256 }, (_, value) => nearestLevel(value, levels));

  // Every channel a canvas holds is an integer 0–255, so the table always answers; the fallbacks are
  // what `noUncheckedIndexedAccess` asks for rather than a case that can arise.
  return remapColors(image, (color) => ({
    r: snapped[color.r] ?? color.r,
    g: snapped[color.g] ?? color.g,
    b: snapped[color.b] ?? color.b,
    a: color.a,
  }));
}

/** The rung nearest a channel value, the lower one taking a tie. */
function nearestLevel(value: number, levels: readonly number[]): number {
  let chosen = value;
  let shortest = Infinity;
  for (const level of levels) {
    const distance = Math.abs(value - level);
    if (distance < shortest) {
      shortest = distance;
      chosen = level;
    }
  }
  return chosen;
}
