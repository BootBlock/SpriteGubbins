import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import type { GridMesh, Rgba } from '../types/quantiser.ts';
import { forEachMeshCell } from './forEachMeshCell.ts';
import { boundaryMesh } from './gridMesh.ts';
import { meshPatches } from './meshPatches.ts';

const CLEAR: Rgba = { r: 0, g: 0, b: 0, a: 0 };
const PALETTE: readonly Rgba[] = [
  { r: 200, g: 60, b: 50, a: 255 },
  { r: 60, g: 160, b: 80, a: 255 },
  { r: 70, g: 90, b: 200, a: 255 },
  { r: 220, g: 200, b: 90, a: 255 },
  { r: 30, g: 30, b: 40, a: 255 },
];

/** A sprite of 8 × 8 cells of `pitch` with its first cell at `left`, `top`. */
interface Sprite {
  readonly left: number;
  readonly top: number;
}

const PITCH = 6;
const CELLS = 8;

/**
 * Two sprites drawn crisply at a pitch of 6 on a transparent field, the first on the lattice from 0
 * and the second three pixels off it — the sheet a resampler returns sprite by sprite, reduced to its
 * two phases. Neighbouring cells always differ, so every cell boundary is a transition.
 */
function twoPhaseSheet(sprites: readonly Sprite[]): ImageData {
  return imageFrom(132, 72, (x, y) => {
    for (const [index, sprite] of sprites.entries()) {
      const column = Math.floor((x - sprite.left) / PITCH);
      const row = Math.floor((y - sprite.top) / PITCH);
      if (column < 0 || row < 0 || column >= CELLS || row >= CELLS) continue;
      return PALETTE[(column * 3 + row * 2 + index) % PALETTE.length] ?? CLEAR;
    }
    return CLEAR;
  });
}

const SPRITES: readonly Sprite[] = [
  { left: 6, top: 6 },
  { left: 75, top: 9 },
];

/** How many visited cells hold more than one colour — cells that straddle a boundary of the art. */
function straddling(image: ImageData, mesh: GridMesh): number {
  let count = 0;
  forEachMeshCell(mesh, image.width, image.height, (_column, _row, left, top, right, bottom) => {
    const colours = new Set<number>();
    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        const at = (y * image.width + x) * 4;
        if ((image.data[at + 3] ?? 0) > 0) colours.add(image.data[at] ?? 0);
      }
    }
    if (colours.size > 1) count += 1;
  });
  return count;
}

describe('meshPatches', () => {
  it('cuts each sprite on its own phase where one list of cuts can agree with only one of them', () => {
    const image = twoPhaseSheet(SPRITES);
    const mesh = boundaryMesh(image, PITCH);

    expect(mesh.patches).toHaveLength(2);
    expect(straddling(image, { ...mesh, patches: [] })).toBeGreaterThan(0);
    expect(straddling(image, mesh)).toBe(0);
  });

  it('keeps the mesh’s count of cells, so the result keeps its size', () => {
    const image = twoPhaseSheet(SPRITES);
    const mesh = boundaryMesh(image, PITCH);
    let visited = 0;
    forEachMeshCell(mesh, image.width, image.height, () => {
      visited += 1;
    });

    expect(visited).toBe(mesh.x.length * mesh.y.length);
  });

  it('re-cuts nothing on a sheet with no transparency', () => {
    const image = twoPhaseSheet(SPRITES);
    // The same drawing with its field painted black rather than cleared.
    const opaque = imageFrom(image.width, image.height, (x, y) => {
      const at = (y * image.width + x) * 4;
      return { r: image.data[at] ?? 0, g: image.data[at + 1] ?? 0, b: image.data[at + 2] ?? 0, a: 255 };
    });

    expect(boundaryMesh(opaque, PITCH).patches).toEqual([]);
  });

  it('re-cuts nothing on a sheet exactly drawn on the grid, whose one lattice is every sprite’s', () => {
    const image = twoPhaseSheet([
      { left: 6, top: 6 },
      { left: 78, top: 12 },
    ]);

    expect(boundaryMesh(image, PITCH).patches).toEqual([]);
  });

  it('re-cuts nothing at a grid of 2, where a sprite’s phase cannot be read', () => {
    const image = twoPhaseSheet(SPRITES);

    expect(meshPatches(image, boundaryMesh(image, 2), 2)).toEqual([]);
  });
});
