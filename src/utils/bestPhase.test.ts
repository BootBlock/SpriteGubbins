import { describe, expect, it } from 'vitest';
import { imageFrom, soften } from '../test/images.ts';
import { upscaleNearest } from './upscaleNearest.ts';
import { bestPhase } from './bestPhase.ts';
import { pixelOffset, readPixel } from './imageData.ts';
import { stepProfile } from './stepProfile.ts';

/** 4 × 4 art, every cell its own colour, drawn at a grid of 4. */
const ART = upscaleNearest(
  imageFrom(4, 4, (x, y) => ({ r: x * 60 + 10, g: y * 60 + 10, b: 120, a: 255 })),
  4,
);

/** The art placed `x`, `y` pixels in from the corner on a flat margin. */
function placed(x: number, y: number): ImageData {
  return imageFrom(ART.width + x, ART.height + y, (px, py) =>
    px < x || py < y
      ? { r: 250, g: 250, b: 250, a: 255 }
      : readPixel(ART.data, pixelOffset(ART.width, px - x, py - y)),
  );
}

/** The two phases at once, which is how `boundaryMesh`'s fallback reads them. */
function phases(image: ImageData, grid: number): { x: number; y: number } {
  const profile = stepProfile(image);
  return { x: bestPhase(profile.columns, grid), y: bestPhase(profile.rows, grid) };
}

describe('bestPhase', () => {
  it('finds where inset art sits, on each axis independently', () => {
    // The fallback placement the mesh rests on when an axis holds too few boundaries to walk: art
    // whose boundaries fall on 2, 6, 10, … is a phase of 2, and the margin's own boundary is on
    // that same lattice.
    expect(phases(placed(2, 3), 4)).toEqual({ x: 2, y: 3 });
    expect(phases(placed(0, 1), 4)).toEqual({ x: 0, y: 1 });
  });

  it('answers the corner for art that sits at the corner', () => {
    expect(phases(ART, 4)).toEqual({ x: 0, y: 0 });
  });

  it('lands within a pixel of the boundary on softened art', () => {
    // Resampling spreads each boundary's step across the pixel before it, the pixel itself and the
    // pixel after, so the heaviest single column can sit one off the truth. That is the misphase
    // `alignToGrid`'s modal vote absorbs — a cell one pixel off on an axis still holds g(g − 1) of
    // its g² pixels from its own art cell — so the claim tested here is a bound, not an exact
    // answer.
    const measured = phases(soften(placed(2, 2)), 4);
    expect(Math.abs(measured.x - 2)).toBeLessThanOrEqual(1);
    expect(Math.abs(measured.y - 2)).toBeLessThanOrEqual(1);
  });

  it('answers the corner for an axis with no structure to place a grid against', () => {
    const flat = imageFrom(32, 32, () => ({ r: 10, g: 20, b: 30, a: 255 }));
    expect(phases(flat, 8)).toEqual({ x: 0, y: 0 });
  });
});
