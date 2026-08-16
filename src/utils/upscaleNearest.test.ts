import { describe, expect, it } from 'vitest';
import { channels, imageFrom } from '../test/images.ts';
import { downscaleNearest } from './gridAlignment.ts';
import { upscaleNearest } from './upscaleNearest.ts';

/** Every pixel a different colour, so any block that samples the wrong source pixel is visible. */
const SOURCE = imageFrom(3, 2, (x, y) => ({ r: x * 50 + 10, g: y * 80 + 20, b: 200, a: 255 }));

describe('upscaleNearest', () => {
  it('draws each pixel as a solid block of itself', () => {
    const scaled = upscaleNearest(SOURCE, 4);
    expect(scaled.width).toBe(12);
    expect(scaled.height).toBe(8);
    // The same image built block-by-block from a formula — byte-identical, or a block sampled the
    // wrong source pixel.
    const expected = imageFrom(12, 8, (x, y) => ({
      r: Math.floor(x / 4) * 50 + 10,
      g: Math.floor(y / 4) * 80 + 20,
      b: 200,
      a: 255,
    }));
    expect(channels(scaled)).toEqual(channels(expected));
  });

  it('round-trips through the reduction it is the inverse of', () => {
    // The property the download depends on: a magnified export is still exact, because a block of
    // identical pixels downsamples back to the pixel it came from.
    expect(channels(downscaleNearest(upscaleNearest(SOURCE, 8), 8, { x: 0, y: 0 }))).toEqual(
      channels(SOURCE),
    );
  });

  it('copies rather than aliasing at a scale of 1', () => {
    const copied = upscaleNearest(SOURCE, 1);
    expect(copied).not.toBe(SOURCE);
    expect(channels(copied)).toEqual(channels(SOURCE));
  });
});
