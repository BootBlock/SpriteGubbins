import { describe, expect, it } from 'vitest';
import type { GridMesh } from '../types/quantiser.ts';
import { forEachMeshCell } from './forEachMeshCell.ts';

type Cell = readonly [number, number, number, number, number, number];

function cells(mesh: GridMesh, width: number, height: number): Cell[] {
  const visited: Cell[] = [];
  forEachMeshCell(mesh, width, height, (...cell) => visited.push(cell));
  return visited;
}

/** How many visited rectangles cover each source pixel. */
function coverage(mesh: GridMesh, width: number, height: number): number[] {
  const counts = new Array<number>(width * height).fill(0);
  for (const [, , left, top, right, bottom] of cells(mesh, width, height)) {
    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) counts[y * width + x] = (counts[y * width + x] ?? 0) + 1;
    }
  }
  return counts;
}

describe('forEachMeshCell', () => {
  it('visits the mesh’s own cells in reading order where there are no patches', () => {
    const mesh: GridMesh = { x: [0, 3], y: [0, 2], patches: [] };

    expect(cells(mesh, 5, 4)).toEqual([
      [0, 0, 0, 0, 3, 2],
      [1, 0, 3, 0, 5, 2],
      [0, 1, 0, 2, 3, 4],
      [1, 1, 3, 2, 5, 4],
    ]);
  });

  it('takes a patch’s rectangles for the cells it covers and the mesh’s everywhere else', () => {
    // Columns 1–2 and rows 1–2 of a 4 × 4 mesh at a pitch of 4, re-cut a pixel later inside.
    const mesh: GridMesh = {
      x: [0, 4, 8, 12],
      y: [0, 4, 8, 12],
      patches: [{ column: 1, row: 1, x: [4, 9], y: [4, 9] }],
    };
    const visited = cells(mesh, 16, 16);

    expect(visited).toHaveLength(16);
    expect(visited.map(([column, row]) => [column, row])).toEqual(
      Array.from({ length: 16 }, (_, index) => [index % 4, Math.floor(index / 4)]),
    );
    expect(visited[5]).toEqual([1, 1, 4, 4, 9, 9]);
    expect(visited[6]).toEqual([2, 1, 9, 4, 12, 9]);
    expect(visited[9]).toEqual([1, 2, 4, 9, 9, 12]);
    expect(visited[10]).toEqual([2, 2, 9, 9, 12, 12]);
    expect(visited[4]).toEqual([0, 1, 0, 4, 4, 8]);
  });

  it('covers every source pixel exactly once, patches and all', () => {
    const mesh: GridMesh = {
      x: [0, 5, 10, 15, 20, 25],
      y: [0, 6, 12, 18],
      patches: [
        { column: 0, row: 0, x: [0, 3, 8], y: [0, 7] },
        { column: 3, row: 1, x: [15, 21, 26], y: [6, 11, 17] },
      ],
    };

    expect(coverage(mesh, 29, 21).every((count) => count === 1)).toBe(true);
  });

  it('closes a patch’s last cell at the mesh’s next cut, or at the image’s edge', () => {
    const mesh: GridMesh = { x: [0, 4, 8], y: [0], patches: [{ column: 1, row: 0, x: [4, 7], y: [0] }] };

    expect(cells(mesh, 10, 2)).toEqual([
      [0, 0, 0, 0, 4, 2],
      [1, 0, 4, 0, 7, 2],
      [2, 0, 7, 0, 10, 2],
    ]);
  });
});
