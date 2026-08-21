import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import { pixelOffset, readPixel } from './imageData.ts';
import { proxyCrops } from './proxyCrops.ts';

const FLAT = { r: 60, g: 60, b: 60, a: 255 };
const GRID = 4;

/**
 * A 64 × 64 sheet that is flat everywhere except one busy 16 × 16 square at (32, 16).
 *
 * The square alternates between two far-apart tones every pixel, so it carries essentially all of
 * the sheet's change and any windowing that reads busyness at all has to land on it.
 */
const ONE_BUSY_PATCH = imageFrom(64, 64, (x, y) => {
  const busy = x >= 32 && x < 48 && y >= 16 && y < 32;
  if (!busy) return FLAT;
  return (x + y) % 2 === 0 ? { r: 250, g: 250, b: 250, a: 255 } : { r: 5, g: 5, b: 5, a: 255 };
});

describe('proxyCrops', () => {
  it('takes as many windows as it was asked for, non-overlapping', () => {
    const crops = proxyCrops(ONE_BUSY_PATCH, GRID, 4, 3);

    expect(crops).toHaveLength(3);
    for (const [index, crop] of crops.entries()) {
      for (const other of crops.slice(index + 1)) {
        const apart =
          crop.left + crop.image.width <= other.left ||
          other.left + other.image.width <= crop.left ||
          crop.top + crop.image.height <= other.top ||
          other.top + other.image.height <= crop.top;
        expect(apart).toBe(true);
      }
    }
  });

  it('lands its first window on the busiest part of the sheet', () => {
    const [first] = proxyCrops(ONE_BUSY_PATCH, GRID, 4, 3);

    expect(first).toBeDefined();
    // The patch is 16 wide at (32, 16) and the window is 16 wide, so the only window covering all of
    // it starts exactly there.
    expect({ left: first?.left, top: first?.top }).toEqual({ left: 32, top: 16 });
  });

  it('starts every window on the grid’s own lattice', () => {
    const crops = proxyCrops(ONE_BUSY_PATCH, 6, 4, 3);

    for (const crop of crops) {
      expect(crop.left % 6).toBe(0);
      expect(crop.top % 6).toBe(0);
      expect(crop.image.width % 6).toBe(0);
      expect(crop.image.height % 6).toBe(0);
    }
  });

  it('returns the pixels that are actually at those coordinates', () => {
    const [first] = proxyCrops(ONE_BUSY_PATCH, GRID, 4, 1);

    expect(first).toBeDefined();
    if (first === undefined) return;
    expect(readPixel(first.image.data, pixelOffset(first.image.width, 0, 0))).toEqual(
      readPixel(ONE_BUSY_PATCH.data, pixelOffset(64, first.left, first.top)),
    );
  });

  it('cuts the window to the sheet where the sheet is smaller than the ask', () => {
    const small = imageFrom(20, 12, () => FLAT);

    const crops = proxyCrops(small, GRID, 40, 3);

    // Twelve is three whole cells, and the shorter edge decides a square window.
    expect(crops[0]?.image.width).toBe(12);
    expect(crops[0]?.image.height).toBe(12);
  });

  it('gives what it has where the sheet holds fewer windows than were asked for', () => {
    const small = imageFrom(20, 12, () => FLAT);

    expect(proxyCrops(small, GRID, 40, 3)).toHaveLength(1);
  });

  it('answers nothing where the sheet is smaller than one cell', () => {
    expect(
      proxyCrops(
        imageFrom(6, 6, () => FLAT),
        8,
        40,
        3,
      ),
    ).toEqual([]);
    expect(
      proxyCrops(
        imageFrom(20, 6, () => FLAT),
        8,
        40,
        3,
      ),
    ).toEqual([]);
  });

  it('answers the same windows every time on a sheet with nothing to choose between', () => {
    // A flat sheet scores every window identically, so what comes back is whatever the tie-break
    // settled. Reading order rather than the sort’s own whim is what makes a second press of Auto
    // give the same answer as the first.
    const flat = imageFrom(64, 64, () => FLAT);

    const once = proxyCrops(flat, GRID, 4, 3);
    const twice = proxyCrops(flat, GRID, 4, 3);

    expect(once.map((crop) => [crop.left, crop.top])).toEqual([
      [0, 0],
      [16, 0],
      [32, 0],
    ]);
    expect(twice.map((crop) => [crop.left, crop.top])).toEqual(once.map((crop) => [crop.left, crop.top]));
  });

  it('reads a cleared background as quiet rather than as detail', () => {
    // Keying leaves the key colour under a transparent pixel, so an unweighted luma would read the
    // boundary between two different cleared colours as the busiest thing on the sheet.
    const keyed = imageFrom(64, 64, (x, y) => {
      if (x >= 32 && x < 48 && y >= 16 && y < 32) {
        return (x + y) % 2 === 0 ? { r: 250, g: 250, b: 250, a: 255 } : { r: 5, g: 5, b: 5, a: 255 };
      }
      // A cleared field whose leftover colours alternate as hard as the art does.
      return (x + y) % 2 === 0 ? { r: 255, g: 0, b: 255, a: 0 } : { r: 0, g: 255, b: 0, a: 0 };
    });

    const [first] = proxyCrops(keyed, GRID, 4, 3);

    expect({ left: first?.left, top: first?.top }).toEqual({ left: 32, top: 16 });
  });
});
