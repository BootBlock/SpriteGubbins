import { describe, expect, it } from 'vitest';
import { DEFAULT_KEY_TOLERANCE } from '../constants/quantiser.ts';
import { imageFrom } from '../test/images.ts';
import type { Rgba } from '../types/quantiser.ts';
import { borderKeyShare } from './borderKeyShare.ts';

const MAGENTA: Rgba = { r: 255, g: 0, b: 255, a: 255 };
const ART: Rgba = { r: 30, g: 90, b: 60, a: 255 };
const CLEAR: Rgba = { r: 0, g: 0, b: 0, a: 0 };

/** Inside the border band of a sheet this size. */
const inside = (x: number, y: number, width: number, height: number): boolean =>
  x > 0 && y > 0 && x < width - 1 && y < height - 1;

describe('borderKeyShare', () => {
  it('reports the whole border where a sheet arrived on a key field', () => {
    const sheet = imageFrom(10, 8, (x, y) => (inside(x, y, 10, 8) ? ART : MAGENTA));

    expect(borderKeyShare(sheet, MAGENTA, DEFAULT_KEY_TOLERANCE)).toBe(1);
  });

  it('counts a field that drifted, as the keying pass would', () => {
    // The eight committed sheets run `#e502e7` to `#f723fa` over their own borders — a resampled key
    // is never one value, which is why this shares the keying pass's own distance rather than
    // comparing colours outright.
    const drifted = imageFrom(10, 8, (x, y) =>
      inside(x, y, 10, 8)
        ? ART
        : { r: 229 + ((x + y) % 12), g: 2 + (x % 6), b: 231 + ((x * y) % 10), a: 255 },
    );

    expect(borderKeyShare(drifted, MAGENTA, DEFAULT_KEY_TOLERANCE)).toBe(1);
  });

  it('reports nothing for a sheet that merely uses the colour inside its artwork', () => {
    // The reason this reads the border and not the whole image: a magenta lamp in the middle of a
    // sheet is artwork, and offering to key it out would be an offer to delete it.
    const sheet = imageFrom(10, 8, (x, y) => (x === 5 && y === 4 ? MAGENTA : ART));

    expect(borderKeyShare(sheet, MAGENTA, DEFAULT_KEY_TOLERANCE)).toBe(0);
  });

  it('reports nothing for a sheet that is already keyed', () => {
    // A sheet this app wrote earlier has a transparent border. Transparent pixels are excluded from
    // the count entirely, so the answer is "nothing to offer" rather than "the border is not key".
    const sheet = imageFrom(10, 8, (x, y) => (inside(x, y, 10, 8) ? ART : CLEAR));

    expect(borderKeyShare(sheet, MAGENTA, DEFAULT_KEY_TOLERANCE)).toBe(0);
  });

  it('falls below a whole border where components reach the edge', () => {
    const sheet = imageFrom(10, 8, (x, y) => (inside(x, y, 10, 8) || x < 2 ? ART : MAGENTA));
    const share = borderKeyShare(sheet, MAGENTA, DEFAULT_KEY_TOLERANCE);

    expect(share).toBeGreaterThan(0.5);
    expect(share).toBeLessThan(1);
  });

  it('reads a one-pixel-high sheet once rather than twice', () => {
    // The degenerate shapes are reachable through a dropped file, and reading the single row as both
    // the top and the bottom would report a share of a border that is half imaginary.
    const strip = imageFrom(4, 1, (x) => (x < 2 ? MAGENTA : ART));

    expect(borderKeyShare(strip, MAGENTA, DEFAULT_KEY_TOLERANCE)).toBe(0.5);
  });

  it('answers an empty image with nothing rather than dividing by zero', () => {
    expect(
      borderKeyShare(
        imageFrom(0, 0, () => ART),
        MAGENTA,
        DEFAULT_KEY_TOLERANCE,
      ),
    ).toBe(0);
  });
});
