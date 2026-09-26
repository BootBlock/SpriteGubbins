import type { CoverageMask, SpriteBox } from '../types/quantiser.ts';
import { FULLY_TRANSPARENT, pixelOffset } from './imageData.ts';

/** How many pixels one word of a mask stands for. */
const WORD_BITS = 32;

/**
 * Which pixels of the box carry any coverage at all, one bit each.
 *
 * Packed rather than listed, because the reader of a mask is a search that lays two of them over one
 * another hundreds of times: one AND of two words compares thirty-two pixels, where a list of the
 * opaque ones costs a read of the image per pixel per candidate. That read per pixel is what once
 * made the frame registration spend ten seconds on a sheet of four large painted frames (issue #470).
 *
 * Only the box is read, so a mask never carries a neighbouring sprite's pixels. Pure.
 */
export function coverageMask(image: ImageData, box: SpriteBox): CoverageMask {
  const stride = Math.ceil(box.width / WORD_BITS);
  const bits = new Uint32Array(stride * box.height);

  for (let row = 0; row < box.height; row += 1) {
    const y = box.top + row;
    for (let column = 0; column < box.width; column += 1) {
      if (image.data[pixelOffset(image.width, box.left + column, y) + 3] === FULLY_TRANSPARENT) continue;
      const word = row * stride + (column >>> 5);
      bits[word] = (bits[word] ?? 0) | (1 << (column & 31));
    }
  }

  return { left: box.left, top: box.top, width: box.width, height: box.height, stride, bits };
}
