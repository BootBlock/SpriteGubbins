import { describe, expect, it } from 'vitest';
import { leadingCellShift } from './leadingCellShift.ts';

describe('leadingCellShift', () => {
  it('reports nothing for a mesh whose leading cells are full', () => {
    expect(leadingCellShift({ x: [0, 6, 12], y: [0, 6, 12] }, 6)).toEqual({ x: 0, y: 0 });
  });

  it('reports a leading cell narrower than the grid as a negative shift', () => {
    expect(leadingCellShift({ x: [0, 3, 11], y: [0, 5, 13] }, 8)).toEqual({ x: -5, y: -3 });
  });

  it('reports a leading cell wider than the grid as a positive shift', () => {
    // An end band folded into the first cell, as on most of the keyed corpus at a grid of 6. A
    // placement confined to `[0, grid)` has no value for it.
    expect(leadingCellShift({ x: [0, 8, 14], y: [0, 7, 13] }, 6)).toEqual({ x: 2, y: 1 });
  });

  it('reports nothing on an axis the mesh does not cut', () => {
    expect(leadingCellShift({ x: [0], y: [0, 4] }, 6)).toEqual({ x: 0, y: -2 });
  });
});
