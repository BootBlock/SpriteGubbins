import { describe, expect, it } from 'vitest';
import { separation } from '../test/tiles.ts';
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

  it.each([4, 8])('disperses consecutive ranks across the tile (%i square)', (size) => {
    const matrix = bayerMatrix(size);
    const between = (rank: number): number =>
      separation(size, matrix.ranks.indexOf(rank), matrix.ranks.indexOf(rank + 1));

    // The one pair the quadrant offsets place exactly: rank 1 sits diagonally opposite rank 0
    // whatever the tile's size. Deeper in the ladder consecutive ranks share a quadrant and come
    // closer, which is why the rest of the claim is an average rather than a bound.
    expect(between(0)).toBeCloseTo(Math.hypot(size / 2, size / 2), 10);

    // Half the tile's edge on average across the whole ladder. The per-entry expansion this guards
    // against — writing each entry as a 2 × 2 block instead of tiling four copies — measures 1.39 at
    // 4 and 1.59 at 8, against this construction's 2.30 and 4.49, so the bound sits between the two
    // rather than on either.
    let total = 0;
    for (let rank = 0; rank + 1 < size * size; rank += 1) total += between(rank);
    expect(total / (size * size - 1)).toBeGreaterThan(size / 2);
  });
});
