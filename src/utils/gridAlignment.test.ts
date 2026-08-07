import { describe, expect, it } from 'vitest';
import { channels, imageFrom, upscale } from '../test/images.ts';
import type { Rgba } from '../types/quantiser.ts';
import { alignToGrid, downscaleNearest } from './gridAlignment.ts';
import { pixelOffset, readPixel } from './imageData.ts';

/** A 16 × 16 source in which every pixel is a different colour, so no block of two is ever uniform. */
const PIXEL_SOURCE = imageFrom(16, 16, (x, y) => ({ r: x * 16 + 1, g: y * 16 + 1, b: 64, a: 255 }));

/** Awkward on purpose: neither dimension is a multiple of 4, so trailing partial cells are covered. */
const NOISY = imageFrom(20, 13, (x, y) => ({
  r: (x * 37 + y * 11) % 256,
  g: (x * 5 + y * 29) % 256,
  b: (x * y) % 256,
  // A transparent column, so alignment is exercised over alpha as well as colour.
  a: x % 5 === 0 ? 0 : 255,
}));

describe('alignToGrid', () => {
  it('is idempotent — aligning an aligned image changes nothing', () => {
    // The clearest single check that the step did what it claims: after it, every cell is one
    // colour, so there is nothing left for a second pass to collapse.
    const once = alignToGrid(NOISY, 4);
    const twice = alignToGrid(once, 4);
    expect(channels(twice)).toEqual(channels(once));
  });

  it('takes the cell’s most frequent colour, never an average of it', () => {
    // An average invents a colour that was not in the image — the opposite of what a palette-limited
    // sprite wants. Three pixels of one colour and one of another must give the majority colour
    // exactly, not the (192, 0, 0) that a mean of them would produce.
    const majority: Rgba = { r: 255, g: 0, b: 0, a: 255 };
    const minority: Rgba = { r: 0, g: 0, b: 255, a: 255 };
    const cell = imageFrom(2, 2, (x, y) => (x === 1 && y === 1 ? minority : majority));

    const aligned = alignToGrid(cell, 2);
    for (let offset = 0; offset < aligned.data.length; offset += 4) {
      expect(readPixel(aligned.data, offset)).toEqual(majority);
    }
  });

  it('aligns the partial cells a sheet cuts short, rather than leaving a ragged edge', () => {
    // 20 × 13 at a grid of 4 leaves a one-row strip at the bottom. Skipping it would leave the only
    // unaligned part of the image exactly where a sprite sheet's last row of components sits.
    //
    // Asserted against the colour the strip should actually hold, not merely against itself: the
    // output buffer starts zero-filled, so "every pixel in the row matches" is equally true of a
    // row that was never written at all — which is precisely the implementation this test rules out.
    const expected = readPixel(NOISY.data, pixelOffset(NOISY.width, 0, 12));
    const aligned = alignToGrid(NOISY, 4);

    for (let x = 0; x < 4; x += 1) {
      expect(readPixel(aligned.data, pixelOffset(aligned.width, x, 12))).toEqual(expected);
    }
  });
});

describe('downscaleNearest', () => {
  it('is lossless after alignment — upscaling reproduces the aligned image exactly', () => {
    // What makes the pair of steps a change of scale rather than a resampling: every pixel in a cell
    // is already identical, so taking the top-left one discards nothing.
    const aligned = alignToGrid(upscale(PIXEL_SOURCE, 8), 8);
    const reduced = downscaleNearest(aligned, 8);
    expect(channels(upscale(reduced, 8))).toEqual(channels(aligned));
  });

  it('keeps trailing partial cells instead of cropping them away', () => {
    // Cropping to a whole multiple of the grid would silently delete a column and a row of a sheet.
    const reduced = downscaleNearest(alignToGrid(NOISY, 4), 4);
    expect(reduced.width).toBe(5);
    expect(reduced.height).toBe(4);
  });
});
