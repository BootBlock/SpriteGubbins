import { describe, expect, it } from 'vitest';
import { latticeBoundaries } from './latticeBoundaries.ts';

/**
 * Rows of a sheet of 256-pixel cells drawn twelve pixels above the grid its prompt states, each piece
 * inside a tile square of 60% of its cell: a veil fills the square, 39 to 193 in the first row, and a
 * top-corner badge spans its top 30 pixels. The true boundaries are 244, 500 and 756.
 */
const STEP = 256;
const veil = (row: number): [number, number] => [row * STEP + 39, row * STEP + 193];
const top = (row: number): [number, number] => [row * STEP + 39, row * STEP + 69];
const bottom = (row: number): [number, number] => [row * STEP + 163, row * STEP + 193];

function read(spans: readonly [number, number][]) {
  return latticeBoundaries(
    spans,
    spans.map(([start, end]) => (start + end) / 2),
    STEP,
  );
}

describe('latticeBoundaries', () => {
  it('places a gap cut off by its window a step on from the one even gap, not k times its place', () => {
    // The gap between the veil and the first badges is even about 244; the next runs from 325 to 551.
    expect(read([veil(0), top(1), top(2)])).toEqual({ inner: [244, 500], missing: null });
  });

  it('places it on the line through two even gaps of an offset sheet', () => {
    expect(read([veil(0), veil(1), veil(2), bottom(3)])).toEqual({ inner: [244, 500, 756], missing: null });
  });

  it('places it at the nominal boundary before any even gap', () => {
    expect(read([top(0), bottom(1)])).toEqual({ inner: [256], missing: null });
  });

  it('names the nominal boundary whose window holds no gap', () => {
    expect(read([[180, 330]])).toEqual({ inner: [], missing: 256 });
  });
});
