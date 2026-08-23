import type { SpriteBox } from '../types/quantiser.ts';
import { CHANNELS_PER_PIXEL, createImage, pixelOffset } from './imageData.ts';

/**
 * One sprite's own pixels, cut from the sheet it was found on.
 *
 * The step between "the app knows where every sprite is" and "every sprite is a file". The boxes
 * come from `spriteSegments`, which labels the connected opaque regions of a finished result — so a
 * crop is the bounding box of one of those regions, transparent corners and all. It is deliberately
 * **not** trimmed further: the box is what the preview drew a ring around, what the manifest states,
 * and what an Aseprite frame is cut from, and a crop that quietly tightened it would give the same
 * sprite two different sizes depending on which file it left in.
 *
 * **Clipped to the sheet rather than trusted.** A box is produced from this image in the ordinary
 * case, but the download scales both by the same factor and a rounding difference at the edge would
 * otherwise read past the end of the channel array and return a band of transparent pixels stitched
 * onto the sprite. Rows outside the sheet are simply not copied, so a box hanging over an edge comes
 * back with what the sheet actually holds.

 *
 * Row by row rather than pixel by pixel: a sprite's row is contiguous in both images, so this is one
 * `set` per row against four channel writes per pixel.
 *
 * Pure, as everything in this directory is.
 */
export function cropSprite(sheet: ImageData, box: SpriteBox): ImageData {
  const sprite = createImage(box.width, box.height);

  for (let row = 0; row < box.height; row += 1) {
    const y = box.top + row;
    if (y < 0 || y >= sheet.height) continue;

    const left = Math.max(0, box.left);
    const right = Math.min(sheet.width, box.left + box.width);
    if (right <= left) continue;

    const from = pixelOffset(sheet.width, left, y);
    const to = pixelOffset(box.width, left - box.left, row);
    sprite.data.set(sheet.data.subarray(from, from + (right - left) * CHANNELS_PER_PIXEL), to);
  }

  return sprite;
}
