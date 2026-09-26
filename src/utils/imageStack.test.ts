import { describe, expect, it } from 'vitest';
import { channels, imageFrom } from '../test/images.ts';
import { stackImages, unstackImage } from './imageStack.ts';
import { CHANNELS_PER_PIXEL, FULLY_TRANSPARENT, alphaAt, pixelOffset } from './imageData.ts';

/** An opaque image of one colour, so where it landed in a stack can be read back by colour. */
const block = (width: number, height: number, r: number) =>
  imageFrom(width, height, () => ({ r, g: 40, b: 90, a: 255 }));

/** Whether every pixel of row `y` is fully transparent. */
function clearRow(image: ImageData, y: number): boolean {
  for (let x = 0; x < image.width; x += 1) {
    if (alphaAt(image.data, pixelOffset(image.width, x, y)) !== FULLY_TRANSPARENT) return false;
  }
  return true;
}

describe('stackImages', () => {
  it('hands back a single image as itself', () => {
    const only = block(5, 3, 10);
    const stack = stackImages([only], 4);

    expect(stack.image).toBe(only);
    expect(stack.regions).toEqual([{ top: 0, width: 5, height: 3 }]);
  });

  it.each([
    { pitch: 1, heights: [3, 2], tops: [0, 4] },
    { pitch: 4, heights: [3, 2], tops: [0, 4] },
    { pitch: 4, heights: [4, 2], tops: [0, 8] },
    { pitch: 8, heights: [9, 1, 3], tops: [0, 16, 24] },
  ])(
    'starts each image on the pitch with a clear row above it: $heights at $pitch',
    ({ pitch, heights, tops }) => {
      const stack = stackImages(
        heights.map((height, index) => block(3, height, 10 + index)),
        pitch,
      );

      expect(stack.regions.map((region) => region.top)).toEqual(tops);
      for (const top of tops.slice(1)) expect(clearRow(stack.image, top - 1)).toBe(true);
    },
  );

  it('pads a narrower image with transparency to the widest one', () => {
    const stack = stackImages([block(2, 1, 10), block(5, 1, 20)], 1);

    expect(stack.image.width).toBe(5);
    expect(alphaAt(stack.image.data, 1 * CHANNELS_PER_PIXEL)).not.toBe(FULLY_TRANSPARENT);
    expect(alphaAt(stack.image.data, 2 * CHANNELS_PER_PIXEL)).toBe(FULLY_TRANSPARENT);
  });

  it('refuses to stack nothing', () => {
    expect(() => stackImages([], 1)).toThrow(/at least one image/);
  });
});

describe('unstackImage', () => {
  it('cuts every image back out as it went in', () => {
    const images = [block(4, 3, 10), block(2, 5, 20), block(6, 1, 30)];
    const stack = stackImages(images, 4);

    expect(unstackImage(stack.image, stack).map(channels)).toEqual(images.map(channels));
  });

  it('hands back a single image as itself', () => {
    const only = block(5, 3, 10);

    expect(unstackImage(only, stackImages([only], 1))).toEqual([only]);
    expect(unstackImage(only, stackImages([only], 1))[0]).toBe(only);
  });
});
