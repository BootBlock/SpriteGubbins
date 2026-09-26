import { describe, expect, it } from 'vitest';
import { nearestPointSearch, type Point4 } from './nearestPointSearch.ts';

/** A fixed-seed generator of values in [0, 1), so a failure names the same points every run. */
function unitStream(seed: number): () => number {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 2 ** 32;
  };
}

/** The definition the search must agree with: every point scored, the earliest taking a tie. */
function bruteForce(points: readonly Point4[], query: Point4): number {
  let chosen = -1;
  let shortest = Infinity;
  for (const [index, point] of points.entries()) {
    const distance = point.reduce((sum, value, axis) => sum + (value - (query[axis] ?? 0)) ** 2, 0);
    if (distance < shortest) {
      shortest = distance;
      chosen = index;
    }
  }
  return chosen;
}

describe('nearestPointSearch', () => {
  it('answers -1 when there are no points', () => {
    expect(nearestPointSearch([])(1, 2, 3, 4)).toBe(-1);
  });

  it('gives a tie to the earliest point, wherever the sort put it', () => {
    // Both points sit 0.5 from the query on the axis they spread across, and the later one sorts
    // first, so a search that stopped at an equal gap would answer with it.
    const points: Point4[] = [
      [0, 10.5, 0, 0],
      [0, 9.5, 0, 0],
    ];
    expect(nearestPointSearch(points)(0, 10, 0, 0)).toBe(0);
    expect(nearestPointSearch([...points].reverse())(0, 10, 0, 0)).toBe(0);
  });

  it('agrees with every point scored, on fractional coordinates and crowded ties', () => {
    const next = unitStream(472);
    const coarse = (): number => Math.floor(next() * 4) * 12.5 - 20;
    for (const size of [1, 2, 3, 9, 31, 128]) {
      const points = Array.from({ length: size }, (_, index): Point4 =>
        index % 2 === 0
          ? [coarse(), coarse(), coarse(), coarse()]
          : [next() * 255, next() * 160 - 80, next() * 160 - 80, next() * 255],
      );
      const nearest = nearestPointSearch(points);
      for (let sample = 0; sample < 300; sample += 1) {
        const query: Point4 =
          sample % 2 === 0
            ? [coarse(), coarse(), coarse(), coarse()]
            : [next() * 255, next() * 160 - 80, next() * 160 - 80, next() * 255];
        expect(nearest(...query), JSON.stringify({ size, query })).toBe(bruteForce(points, query));
      }
    }
  });
});
