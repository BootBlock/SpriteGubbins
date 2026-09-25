import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import type { Rgba, SpriteBox } from '../types/quantiser.ts';
import { bordersArtwork } from './bordersArtwork.ts';
import { FULLY_OPAQUE, FULLY_TRANSPARENT } from './imageData.ts';

const INK: Rgba = { r: 20, g: 30, b: 40, a: FULLY_OPAQUE };
const FAINT: Rgba = { r: 20, g: 30, b: 40, a: 1 };
const CLEAR: Rgba = { r: 0, g: 0, b: 0, a: FULLY_TRANSPARENT };

/** The region every case asks about: columns 4 to 7 and rows 4 to 7 of a 12 × 12 sheet. */
const REGION: SpriteBox = { left: 4, top: 4, width: 4, height: 4, pixels: 0 };

/** A 12 × 12 sheet with one drawn pixel at each of the points given, in the colour given. */
function sheetWith(points: readonly (readonly [number, number])[], color: Rgba = INK): ImageData {
  return imageFrom(12, 12, (x, y) => (points.some(([px, py]) => px === x && py === y) ? color : CLEAR));
}

describe('bordersArtwork', () => {
  it('is clear where nothing is drawn around the region', () => {
    expect(bordersArtwork(sheetWith([]), REGION)).toBe(false);
  });

  it.each([
    ['above', [5, 3]],
    ['below', [6, 8]],
    ['to the left', [3, 6]],
    ['to the right', [8, 5]],
    ['at a corner', [8, 8]],
  ] as const)('finds a pixel directly against the region %s', (_side, point) => {
    expect(bordersArtwork(sheetWith([point]), REGION)).toBe(true);
  });

  it('ignores a pixel one clear pixel away, which the labelling keeps apart', () => {
    expect(
      bordersArtwork(
        sheetWith([
          [2, 2],
          [9, 6],
          [6, 9],
        ]),
        REGION,
      ),
    ).toBe(false);
  });

  it('ignores what is drawn inside the region, which the write replaces', () => {
    expect(
      bordersArtwork(
        sheetWith([
          [4, 4],
          [7, 7],
        ]),
        REGION,
      ),
    ).toBe(false);
  });

  it('counts a barely covered pixel as drawn, as the labelling does', () => {
    expect(bordersArtwork(sheetWith([[3, 3]], FAINT), REGION)).toBe(true);
  });

  it('keeps to the sheet where the region meets its edge', () => {
    const corner: SpriteBox = { left: 0, top: 0, width: 12, height: 12, pixels: 0 };

    expect(
      bordersArtwork(
        sheetWith([
          [0, 0],
          [11, 11],
        ]),
        corner,
      ),
    ).toBe(false);
  });
});
