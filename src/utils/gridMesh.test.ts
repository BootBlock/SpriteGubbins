import { describe, expect, it } from 'vitest';
import { imageFrom, soften } from '../test/images.ts';
import type { Rgba } from '../types/quantiser.ts';
import { boundaryMesh, regularMesh } from './gridMesh.ts';

/** Cells of distinct colours at boundary positions this file writes down explicitly. */
function sheetWithBoundaries(
  size: number,
  xStarts: readonly number[],
  yStarts: readonly number[],
): ImageData {
  const cellOf = (starts: readonly number[], position: number): number => {
    let cell = 0;
    for (const [index, start] of starts.entries()) if (position >= start) cell = index;
    return cell;
  };
  return imageFrom(size, size, (x, y) => {
    const index = cellOf(yStarts, y) * 32 + cellOf(xStarts, x);
    return { r: (index * 71 + 40) % 256, g: (index * 149 + 80) % 256, b: (index * 37 + 120) % 256, a: 255 };
  });
}

describe('boundaryMesh', () => {
  it('measures a regular sheet out to the regular lattice, losing nothing to the measurement', () => {
    const starts = [0, 8, 16, 24, 32, 40, 48, 56];
    const sheet = sheetWithBoundaries(64, starts, starts);
    expect(boundaryMesh(sheet, 8)).toEqual(regularMesh(64, 64, 8, { x: 0, y: 0 }));
  });

  it('snaps its cuts to drifting boundaries a fixed lattice walks out of register with', () => {
    // The sheet generators actually return: spacings that wander between 6 and 7, so that a lattice
    // of 6 is two pixels out of register by the sixth cell and a lattice of 7 by the third. The
    // mesh follows the boundaries themselves. The sheet is 62 wide so its last cell ends flush —
    // the trailing-edge case has its own coverage in the transforms' tests.
    const starts = [0, 6, 12, 19, 25, 31, 38, 44, 51];
    const sheet = sheetWithBoundaries(57, starts, starts);

    const mesh = boundaryMesh(sheet, 6);

    expect(mesh.x).toEqual(starts);
    expect(mesh.y).toEqual(starts);
  });

  it('follows the same drifting boundaries through the softening a model applies', () => {
    const starts = [0, 6, 12, 19, 25, 31, 38, 44, 51];
    const sheet = soften(sheetWithBoundaries(57, starts, starts));

    const mesh = boundaryMesh(sheet, 6);

    // Softening can pull a mass-weighted line centre one pixel off the crisp boundary; the mesh is
    // useful as long as every cut sits within that pixel, which is what the modal vote absorbs.
    expect(mesh.x.length).toBe(starts.length);
    for (const [index, start] of mesh.x.entries()) {
      const truth = starts[index];
      if (truth === undefined) break;
      expect(Math.abs(start - truth)).toBeLessThanOrEqual(1);
    }
  });

  it('completes a boundary too faint to detect at the spacing its neighbours expect', () => {
    // Two adjacent cells sharing a colour erase the boundary between them — there is no step to
    // detect. A missing cut would merge the art's cells for good, so the mesh inserts one at the
    // expected position and the region simply votes the same colour on both sides of it.
    const starts = [0, 8, 16, 24, 32, 40, 48, 56];
    const shared: Rgba = { r: 90, g: 140, b: 60, a: 255 };
    const sheet = imageFrom(64, 64, (x, y) => {
      const cellX = Math.floor(x / 8);
      const cellY = Math.floor(y / 8);
      // Cells (2, ·) and (3, ·) share one colour, erasing the boundary at x = 24 entirely.
      if (cellX === 2 || cellX === 3) return shared;
      const index = cellY * 8 + cellX;
      return { r: (index * 71 + 40) % 256, g: (index * 149 + 80) % 256, b: (index * 37 + 120) % 256, a: 255 };
    });

    const mesh = boundaryMesh(sheet, 8);

    expect(mesh.x).toEqual(starts);
  });

  it('ignores a strong interior edge that sits nowhere near the expected spacing', () => {
    // Art detail inside a cell — a high-contrast marking mid-block — is a boundary candidate by
    // mass, and accepting it would cut a cell of the art in half. Only lines within a third of a
    // cell of the expected position are taken.
    const starts = [0, 8, 16, 24, 32, 40, 48, 56];
    const sheet = imageFrom(64, 64, (x, y) => {
      // A hard vertical edge at x = 20 — mid-cell — on top of a regular grid of 8.
      if (x >= 20 && x < 22 && y >= 8 && y < 56) return { r: 250, g: 250, b: 250, a: 255 };
      const index = Math.floor(y / 8) * 8 + Math.floor(x / 8);
      return { r: (index * 71 + 40) % 256, g: (index * 149 + 80) % 256, b: (index * 37 + 120) % 256, a: 255 };
    });

    const mesh = boundaryMesh(sheet, 8);

    expect(mesh.x).toEqual(starts);
  });

  it('falls back to the regular lattice where an image holds too few boundaries to anchor one', () => {
    const flat = imageFrom(32, 32, () => ({ r: 10, g: 20, b: 30, a: 255 }));
    expect(boundaryMesh(flat, 8)).toEqual(regularMesh(32, 32, 8, { x: 0, y: 0 }));
  });

  it('degenerates to one cell per pixel at a grid of 1', () => {
    const sheet = sheetWithBoundaries(8, [0, 4], [0, 4]);
    const mesh = boundaryMesh(sheet, 1);
    expect(mesh.x).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(mesh.y).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
});
