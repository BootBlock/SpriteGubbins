import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import { patchSpans } from './patchSpans.ts';

const INK = { r: 40, g: 40, b: 40, a: 255 } as const;
const CLEAR = { r: 0, g: 0, b: 0, a: 0 } as const;

/** A transparent sheet with an opaque rectangle `[left, right) × [top, bottom)` for each box given. */
function sheet(width: number, height: number, boxes: readonly (readonly [number, number, number, number])[]) {
  return imageFrom(width, height, (x, y) =>
    boxes.some(([left, top, right, bottom]) => x >= left && x < right && y >= top && y < bottom)
      ? INK
      : CLEAR,
  );
}

/** A regular mesh of `grid` from 0 over a `width` × `height` sheet. */
function mesh(width: number, height: number, grid: number) {
  const starts = (extent: number) =>
    Array.from({ length: Math.ceil(extent / grid) }, (_, index) => index * grid);
  return { x: starts(width), y: starts(height) };
}

describe('patchSpans', () => {
  it('finds nothing to patch on a sheet with no transparency', () => {
    const opaque = imageFrom(40, 40, () => INK);

    expect(patchSpans(opaque, mesh(40, 40, 4), 1)).toEqual([]);
  });

  it('widens each sprite out to the mesh’s cuts and then by the margin', () => {
    // Sprites over cells 3–5 and 14–16 of a 4-pixel mesh, far apart on both axes.
    const image = sheet(80, 80, [
      [13, 13, 23, 23],
      [57, 57, 67, 67],
    ]);

    expect(patchSpans(image, mesh(80, 80, 4), 1)).toEqual([
      { column: 2, columnEnd: 7, row: 2, rowEnd: 7 },
      { column: 13, columnEnd: 18, row: 13, rowEnd: 18 },
    ]);
  });

  it('splits the gap between two sprites whose margins meet, and each keeps its own cells', () => {
    // Cores over cells 2–4 and 6–8 on the x axis: one empty cell between them, and a margin of 2
    // would give both of them that cell and the ones either side of it.
    const image = sheet(48, 16, [
      [8, 4, 20, 12],
      [24, 4, 36, 12],
    ]);
    const [first, second] = patchSpans(image, mesh(48, 16, 4), 2);

    expect(first?.columnEnd).toBe(5);
    expect(second?.column).toBe(5);
    expect(first?.column).toBe(0);
    expect(second?.columnEnd).toBe(11);
  });

  it('merges two sprites whose cells overlap into one span', () => {
    // Pieces two pixels apart inside one pair of 4-pixel cells: no mesh can cut between them.
    const image = sheet(40, 40, [
      [12, 12, 17, 24],
      [19, 12, 24, 24],
    ]);

    expect(patchSpans(image, mesh(40, 40, 4), 1)).toEqual([{ column: 2, columnEnd: 7, row: 2, rowEnd: 7 }]);
  });

  it('holds a sprite’s margin inside the sheet at its edge', () => {
    const image = sheet(40, 40, [[0, 0, 6, 6]]);

    expect(patchSpans(image, mesh(40, 40, 4), 1)).toEqual([{ column: 0, columnEnd: 3, row: 0, rowEnd: 3 }]);
  });
});
