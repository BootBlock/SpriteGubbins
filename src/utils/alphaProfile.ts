import type { AlphaProfile, ProfiledSprite, SpriteBox } from '../types/quantiser.ts';
import { CHANNELS_PER_PIXEL, FULLY_TRANSPARENT, pixelOffset } from './imageData.ts';

/** One sprite's profile, read off its box in one pass over its alpha bytes. See `AlphaProfile`. */
export function alphaProfile(image: ImageData, box: SpriteBox): AlphaProfile {
  const rows = new Int32Array(box.height);
  const columns = new Int32Array(box.width);
  let visible = 0;
  for (let row = 0; row < box.height; row += 1) {
    let at = pixelOffset(image.width, box.left, box.top + row) + 3;
    for (let column = 0; column < box.width; column += 1) {
      const alpha = image.data[at] ?? 0;
      if (alpha !== FULLY_TRANSPARENT) {
        rows[row] = (rows[row] ?? 0) + alpha;
        columns[column] = (columns[column] ?? 0) + alpha;
        visible += 1;
      }
      at += CHANNELS_PER_PIXEL;
    }
  }
  return { rows, columns, visible };
}

/**
 * The summed difference between two profiles with the second laid `offset` places along the
 * first, every place outside one of them reading as nothing.
 *
 * A lower bound on the sum of alpha differences over the whole union box at that offset along this
 * axis, whatever the offset along the other: see `AlphaProfile`.
 */
export function profileGap(left: Int32Array, right: Int32Array, offset: number): number {
  let gap = 0;
  for (let at = Math.min(0, offset); at < Math.max(left.length, offset + right.length); at += 1) {
    gap += Math.abs((left[at] ?? 0) - (right[at - offset] ?? 0));
  }
  return gap;
}

/** Each box beside its profile, in the order given. */
export function profileSprites(image: ImageData, boxes: readonly SpriteBox[]): ProfiledSprite[] {
  return boxes.map((box) => ({ box, profile: alphaProfile(image, box) }));
}
