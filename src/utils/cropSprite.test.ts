import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import { cropSprite } from './cropSprite.ts';
import { pixelOffset, readPixel } from './imageData.ts';

/** A sheet whose every pixel says where it came from, so a crop can be checked position by position. */
const SHEET = imageFrom(8, 6, (x, y) => ({ r: x * 16, g: y * 16, b: 0, a: 255 }));

describe('cropSprite', () => {
  it('takes the box, and only the box', () => {
    const sprite = cropSprite(SHEET, { left: 2, top: 1, width: 3, height: 2, pixels: 6 });

    expect(sprite.width).toBe(3);
    expect(sprite.height).toBe(2);
    expect(readPixel(sprite.data, pixelOffset(3, 0, 0))).toStrictEqual({ r: 32, g: 16, b: 0, a: 255 });
    expect(readPixel(sprite.data, pixelOffset(3, 2, 1))).toStrictEqual({ r: 64, g: 32, b: 0, a: 255 });
  });

  it('keeps the whole box when the artwork does not fill it', () => {
    // A bounding box is what the preview rings and what the manifest states, so a crop that trimmed
    // to the opaque pixels would give one sprite two different sizes in two different files.
    const sparse = imageFrom(4, 4, (x, y) => ({ r: 255, g: 0, b: 255, a: x === 1 && y === 1 ? 255 : 0 }));
    const sprite = cropSprite(sparse, { left: 0, top: 0, width: 4, height: 4, pixels: 1 });

    expect([sprite.width, sprite.height]).toStrictEqual([4, 4]);
    expect(readPixel(sprite.data, pixelOffset(4, 0, 0)).a).toBe(0);
  });

  it('returns what the sheet holds where the box hangs over an edge', () => {
    // Reachable through rounding between a scaled box and a scaled sheet; without the clip this read
    // past the end of the channel array and stitched a band of the next row onto the sprite.
    const sprite = cropSprite(SHEET, { left: 6, top: 4, width: 4, height: 4, pixels: 4 });

    expect([sprite.width, sprite.height]).toStrictEqual([4, 4]);
    // The two columns and two rows that exist are copied where they belong…
    expect(readPixel(sprite.data, pixelOffset(4, 0, 0))).toStrictEqual({ r: 96, g: 64, b: 0, a: 255 });
    expect(readPixel(sprite.data, pixelOffset(4, 1, 1))).toStrictEqual({ r: 112, g: 80, b: 0, a: 255 });
    // …and everything past the sheet's own edge is left as the transparent it was created as.
    expect(readPixel(sprite.data, pixelOffset(4, 2, 0)).a).toBe(0);
    expect(readPixel(sprite.data, pixelOffset(4, 0, 2)).a).toBe(0);
  });

  it('answers a box that is entirely outside the sheet with an empty crop', () => {
    const sprite = cropSprite(SHEET, { left: 20, top: 20, width: 2, height: 2, pixels: 0 });

    expect([...sprite.data]).toStrictEqual(Array.from({ length: 2 * 2 * 4 }, () => 0));
  });
});
