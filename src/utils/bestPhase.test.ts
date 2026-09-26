import { describe, expect, it } from 'vitest';
import { imageFrom, soften } from '../test/images.ts';
import { sequence } from '../test/sequence.ts';
import { upscaleNearest } from './upscaleNearest.ts';
import { bestPhase } from './bestPhase.ts';
import { boundaryClusters } from './boundaryClusters.ts';
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

/**
 * Art of random colours drawn at `grid`, its boundaries on `phase, phase + grid, …` on both axes —
 * dense, uniform detail, with no margin or frame to stand a boundary clear of the rest.
 */
function randomArt(grid: number, phase: number): ImageData {
  const next = sequence(grid * 10 + phase);
  const cells = 24;
  const colours = Array.from({ length: (cells + 1) ** 2 }, () => ({
    r: Math.floor(next() * 256),
    g: Math.floor(next() * 256),
    b: Math.floor(next() * 256),
    a: 255,
  }));
  const cell = (position: number) => Math.floor((position - phase + grid) / grid);
  return imageFrom(cells * grid, cells * grid, (x, y) => colours[cell(y) * (cells + 1) + cell(x)]!);
}

/** The two phases at once, which is how `boundaryMesh`'s fallback reads them. */
function phases(image: ImageData, grid: number): { x: number; y: number } {
  const profile = stepProfile(image);
  return {
    x: bestPhase(profile.columnEvidence, grid),
    y: bestPhase(profile.rowEvidence, grid),
  };
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

  it('lands on the boundary itself on softened art', () => {
    // Resampling spreads each boundary's step across the pixel before it, the pixel itself and the
    // pixel after, in equal thirds, and the centre of that spread is the boundary.
    expect(phases(soften(placed(2, 2)), 4)).toEqual({ x: 2, y: 2 });
    expect(phases(soften(placed(1, 3)), 4)).toEqual({ x: 1, y: 3 });
  });

  it('places softened dense detail exactly, where the mesh finds no lines and falls back to it', () => {
    // The case #483 measured: random art behind a three-tap blur at a pitch of 4 or 5 has no boundary
    // that stands clear of its background, so the mesh has nothing to walk and the lattice goes
    // wherever this says. The three classes a softened boundary spreads over tie, and the heaviest
    // of them was a pixel early at every phase from 2 up. A pitch of 6 finds lines at some phases,
    // and is read here as the estimate alone.
    for (const grid of [4, 5, 6]) {
      for (let phase = 0; phase < grid; phase += 1) {
        const image = soften(randomArt(grid, phase));
        const label = `grid ${grid}, phase ${phase}`;
        expect(phases(image, grid), label).toEqual({ x: phase, y: phase });
        if (grid < 6) {
          expect(boundaryClusters(stepProfile(image).columnEvidence).length, label).toBeLessThan(2);
        }
      }
    }
  });

  it('answers the corner for an axis with no structure to place a grid against', () => {
    const flat = imageFrom(32, 32, () => ({ r: 10, g: 20, b: 30, a: 255 }));
    expect(phases(flat, 8)).toEqual({ x: 0, y: 0 });
  });

  it('answers the corner for change spread evenly over every phase', () => {
    // The phases cancel around the circle, and the angle of what rounding leaves is not a placement.
    expect(bestPhase(new Float64Array(97).fill(3), 6)).toBe(0);
  });
});
