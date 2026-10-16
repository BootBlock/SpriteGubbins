import { describe, expect, it } from 'vitest';
import { axisTolerance } from './axisTolerance.ts';

describe('axisTolerance', () => {
  it('stays under half a cell at every grid, so a capture always knows which boundary it took', () => {
    // The window this replaced was 1 at a grid of 2 — exactly half a cell, where a line one pixel
    // from the expected boundary is one pixel from the next boundary too.
    for (let grid = 2; grid <= 64; grid += 1) {
      expect(2 * axisTolerance(grid), `grid ${String(grid)}`).toBeLessThan(grid);
    }
  });

  it('is a third of a cell rounded down, and 0 at a grid of 2', () => {
    expect([2, 3, 4, 5, 6, 8, 9, 12].map(axisTolerance)).toEqual([0, 1, 1, 1, 2, 2, 3, 4]);
  });
});
