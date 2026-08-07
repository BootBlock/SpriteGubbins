import { describe, expect, it } from 'vitest';
import { PALETTE_COLOR_COUNTS } from '../constants/quantiser.ts';
import { channels, imageFrom, upscale } from '../test/images.ts';
import { quantiseImage } from './quantiseImage.ts';

/** 16 × 16 art, every pixel a different colour. */
const SPRITE = imageFrom(16, 16, (x, y) => ({ r: x * 16 + 1, g: y * 16 + 1, b: 64, a: 255 }));

/** 200 pixels, every one a different colour, already at its own resolution. */
const TWO_HUNDRED_COLORS = imageFrom(20, 10, (x, y) => {
  const n = y * 20 + x;
  return { r: (n * 7) % 256, g: (n * 13) % 256, b: (n * 29) % 256, a: 255 };
});

describe('quantiseImage', () => {
  it('recovers the art a sheet was drawn at from the sheet it came back on', () => {
    // The whole feature in one assertion: 16 × 16 art returned on a 128 × 128 canvas comes back as
    // the 16 × 16 art, pixel for pixel, with nothing invented and nothing lost.
    const result = quantiseImage(upscale(SPRITE, 8), { grid: 8, maxColors: null });

    expect(result.image.width).toBe(16);
    expect(result.image.height).toBe(16);
    expect(channels(result.image)).toEqual(channels(SPRITE));
  });

  it('reduces the palette to the colour count it is given', () => {
    const result = quantiseImage(TWO_HUNDRED_COLORS, { grid: 1, maxColors: 32 });

    expect(result.colorsBefore).toBe(200);
    expect(result.colorsAfter).toBe(32);
  });

  it('leaves the colours alone for UNRESTRICTED', () => {
    // `UNRESTRICTED` is `null` rather than a generous cap, and this is what that buys: a painted or
    // 3D-rendered sheet passes through the palette step untouched instead of being reduced to some
    // figure nobody chose. A grid of 1 is the identity for the two steps before it.
    const result = quantiseImage(TWO_HUNDRED_COLORS, {
      grid: 1,
      maxColors: PALETTE_COLOR_COUNTS.UNRESTRICTED,
    });

    expect(PALETTE_COLOR_COUNTS.UNRESTRICTED).toBeNull();
    expect(result.colorsAfter).toBe(result.colorsBefore);
    expect(channels(result.image)).toEqual(channels(TWO_HUNDRED_COLORS));
  });

  it('reports the colour counts of the source and of the result, not of the steps between', () => {
    // The summary claims "4,096 colours became 32". `colorsBefore` therefore has to be the sheet the
    // user dropped, before alignment collapsed anything — otherwise the figure understates the work
    // and the two numbers are not comparable.
    const result = quantiseImage(upscale(SPRITE, 8), { grid: 8, maxColors: 32 });

    expect(result.colorsBefore).toBe(256);
    expect(result.colorsAfter).toBe(32);
  });
});
