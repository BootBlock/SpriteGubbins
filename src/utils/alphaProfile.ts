import type { AlphaProfile, SpriteBox } from '../types/quantiser.ts';
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
