import { describe, expect, it } from 'vitest';
import { bayerMatrix } from './bayerMatrix.ts';

/**
 * The two facts a threshold matrix has to have, and the one that is easy to lose.
 *
 * Holding every rank once is what makes a ratio of `k / levels` put exactly `k` positions on the
 * plan's second colour. **Dispersing consecutive ranks is the half a plausible-looking construction
 * silently gets wrong**: expanding each entry into a 2 × 2 block rather than tiling four copies of
 * the whole matrix produces a matrix passing the first test and clustering the second — and the
 * result is a sheet dithered in clumps rather than in an even texture, which reads as a rendering
 * fault rather than as a wrong number.
 */
describe('bayerMatrix', () => {
  it('is the published 4 × 4 matrix', () => {
    const matrix = bayerMatrix(4);
    expect(matrix.size).toBe(4);
    expect(matrix.levels).toBe(16);
    expect([...matrix.ranks]).toEqual([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]);
  });

  it.each([4, 8])('holds every rank of its %i × %i ladder exactly once', (size) => {
    const matrix = bayerMatrix(size);
    expect(matrix.levels).toBe(size * size);
    expect([...matrix.ranks].sort((left, right) => left - right)).toEqual(
      Array.from({ length: size * size }, (_, rank) => rank),
    );
  });

  it.each([4, 8])('disperses consecutive ranks across the tile (%i × the same)', (size) => {
    const matrix = bayerMatrix(size);
    const at = (rank: number): { x: number; y: number } => {
      const index = matrix.ranks.indexOf(rank);
      return { x: index % size, y: Math.floor(index / size) };
    };

    // Wrapped, because the tile repeats: two positions on opposite edges are neighbours on the
    // sheet however far apart they look in the array.
    const separation = (rank: number): number => {
      const one = at(rank);
      const other = at(rank + 1);
      const dx = Math.min(Math.abs(one.x - other.x), size - Math.abs(one.x - other.x));
      const dy = Math.min(Math.abs(one.y - other.y), size - Math.abs(one.y - other.y));
      return Math.hypot(dx, dy);
    };

    // The two positions the first quadrant offset puts furthest apart, which is exact: rank 1 sits
    // diagonally opposite rank 0 whatever the tile's size.
    expect(separation(0)).toBeCloseTo(Math.hypot(size / 2, size / 2), 10);

    // And across the whole ladder, half the tile's edge on average. The per-entry expansion this
    // guards against measures 1.39 at 4 and 1.59 at 8, against this construction's 2.30 and 4.49 —
    // so the bound sits comfortably between the two rather than on either.
    let total = 0;
    for (let rank = 0; rank + 1 < size * size; rank += 1) total += separation(rank);
    expect(total / (size * size - 1)).toBeGreaterThan(size / 2);
  });
});
