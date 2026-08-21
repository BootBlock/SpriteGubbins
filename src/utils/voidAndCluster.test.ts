import { describe, expect, it } from 'vitest';
import { meanNearest, scatter } from '../test/tiles.ts';
import { voidAndClusterRanks } from './voidAndCluster.ts';

describe('voidAndClusterRanks', () => {
  const SIZE = 32;
  const ranks = voidAndClusterRanks(SIZE);

  it('ranks every position of the tile exactly once', () => {
    expect(ranks.length).toBe(SIZE * SIZE);
    expect([...ranks].sort((left, right) => left - right)).toEqual(
      Array.from({ length: SIZE * SIZE }, (_, rank) => rank),
    );
  });

  it('gives the same tile every time it is asked', () => {
    // The published algorithm opens from a random scatter. This one opens from a fixed seed, because
    // a positional dither whose tile differed between two runs would put a different pattern on two
    // sheets of one series — which is the whole failure the approach exists to avoid.
    expect([...voidAndClusterRanks(SIZE)]).toEqual([...ranks]);
  });

  /**
   * The property the ranking exists for, tested on **both** sides of the halfway point.
   *
   * A mixing plan puts `steps` of every `levels` positions on its second colour, and `steps` runs the
   * whole ladder — so the set that has to be well spread is the *minority* at every share, which
   * below a half is the positions holding the lowest ranks and above it the ones holding the
   * highest. Testing only the low shares is what let an inverted second half ship: the published
   * algorithm reverses the roles of ones and zeros past the middle, and reading that reversal as a
   * change of sign on one energy field — rather than as no change at all, which is what a wrapped
   * kernel makes it — fills the well-spread positions first and leaves the clumps for last.
   */
  it.each([0.05, 0.1, 0.25, 0.75, 0.9, 0.95])('spreads the minority at a share of %d', (share) => {
    const wanted = Math.round(SIZE * SIZE * share);
    const low = share <= 0.5;
    const chosen = [...ranks.keys()].filter((at) =>
      low ? (ranks[at] ?? 0) < wanted : (ranks[at] ?? 0) >= wanted,
    );
    expect(chosen.length).toBe(low ? wanted : SIZE * SIZE - wanted);

    // Measured against a scatter of the same size, the ranking wins by 1.71× at a twentieth of the
    // positions, 1.54× at a tenth and 1.18× at a quarter — the margin narrowing where the set is
    // crowded simply because it has less room to be spread. The bound sits below the narrowest of
    // those and far above 1, which is where a ranking that had stopped dispersing would land.
    expect(meanNearest(SIZE, chosen)).toBeGreaterThan(
      meanNearest(SIZE, scatter(SIZE, chosen.length, 12345)) * 1.15,
    );
  });
});
