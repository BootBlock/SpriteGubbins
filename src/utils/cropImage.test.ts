import { describe, expect, it } from 'vitest';
import { channels, imageFrom } from '../test/images.ts';
import { cropImage } from './cropImage.ts';
import { pixelOffset, readPixel } from './imageData.ts';

/** Every pixel carries its own position, so a crop's contents say where they came from. */
const SHEET = imageFrom(8, 6, (x, y) => ({ r: x * 8, g: y * 8, b: 0, a: 255 }));

describe('cropImage', () => {
  it('takes the rectangle asked for, from the position asked for', () => {
    const crop = cropImage(SHEET, 3, 2, 4, 3);

    expect(crop.width).toBe(4);
    expect(crop.height).toBe(3);
    expect(readPixel(crop.data, pixelOffset(4, 0, 0))).toEqual({ r: 24, g: 16, b: 0, a: 255 });
    expect(readPixel(crop.data, pixelOffset(4, 3, 2))).toEqual({ r: 48, g: 32, b: 0, a: 255 });
  });

  it('keeps alpha, which is what a keyed sheet is mostly made of', () => {
    const keyed = imageFrom(4, 4, (x) => ({ r: 10, g: 20, b: 30, a: x < 2 ? 0 : 255 }));

    expect([...cropImage(keyed, 0, 0, 4, 1).data]).toEqual([...keyed.data.subarray(0, 16)]);
  });

  it('copies the whole image where the rectangle is the whole image', () => {
    expect(channels(cropImage(SHEET, 0, 0, 8, 6))).toEqual(channels(SHEET));
  });

  it('returns a copy rather than a view, so writing to one does not reach the other', () => {
    const crop = cropImage(SHEET, 0, 0, 2, 2);
    crop.data[0] = 1;

    expect(SHEET.data[0]).toBe(0);
  });

  it('refuses a rectangle that leaves the image rather than clipping it', () => {
    // Clipping would hand a caller a smaller picture than it asked for, and the sweep compares its
    // crops against results — where a row missing reads as a difference in the artwork.
    expect(() => cropImage(SHEET, 6, 0, 4, 2)).toThrow(/inside the image/);
    expect(() => cropImage(SHEET, 0, 5, 2, 4)).toThrow(/inside the image/);
    expect(() => cropImage(SHEET, -1, 0, 2, 2)).toThrow(/inside the image/);
    expect(() => cropImage(SHEET, 0, 0, 0, 2)).toThrow(/at least one pixel/);
  });
});
