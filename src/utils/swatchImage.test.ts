import { describe, expect, it } from 'vitest';
import type { Rgba } from '../types/quantiser.ts';
import { pixelOffset, readPixel } from './imageData.ts';
import { swatchImage } from './swatchImage.ts';

const GREEN: Rgba = { r: 40, g: 160, b: 60, a: 255 };
const RED: Rgba = { r: 200, g: 40, b: 40, a: 255 };
/** An entry that arrived carrying a coverage, which a swatch may not reproduce. */
const FAINT: Rgba = { r: 10, g: 20, b: 30, a: 64 };

describe('swatchImage', () => {
  it('draws one block per colour, in a single row, in the order given', () => {
    const image = swatchImage([GREEN, RED], 4);

    expect([image.width, image.height]).toEqual([8, 4]);
    expect(readPixel(image.data, pixelOffset(image.width, 0, 0))).toEqual(GREEN);
    expect(readPixel(image.data, pixelOffset(image.width, 3, 3))).toEqual(GREEN);
    expect(readPixel(image.data, pixelOffset(image.width, 4, 0))).toEqual(RED);
    expect(readPixel(image.data, pixelOffset(image.width, 7, 3))).toEqual(RED);
  });

  it('puts the nth colour at n × block across, whatever the block size', () => {
    const image = swatchImage([GREEN, RED, GREEN], 1);

    expect([image.width, image.height]).toEqual([3, 1]);
    expect(readPixel(image.data, pixelOffset(3, 1, 0))).toEqual(RED);
  });

  it('writes every block fully opaque', () => {
    const image = swatchImage([FAINT], 2);

    expect(readPixel(image.data, pixelOffset(2, 1, 1))).toEqual({ ...FAINT, a: 255 });
  });
});
