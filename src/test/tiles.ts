/**
 * Measuring how well a set of positions is spread across a repeating square tile.
 *
 * Test-only, and shared because both threshold patterns are judged on the same property and by the
 * same arithmetic: a tile repeats across the sheet from the image's own origin, so two positions on
 * opposite edges are neighbours in the result however far apart they look in the array. Written
 * twice, the two would be free to disagree about that wrap — which is the one thing either
 * measurement is really about.
 */

/** The wrapped distance between two positions of a `size`-square tile. */
export function separation(size: number, one: number, other: number): number {
  const oneX = one % size;
  const otherX = other % size;
  const dx = Math.min(Math.abs(oneX - otherX), size - Math.abs(oneX - otherX));
  const oneY = (one - oneX) / size;
  const otherY = (other - otherX) / size;
  const dy = Math.min(Math.abs(oneY - otherY), size - Math.abs(oneY - otherY));
  return Math.hypot(dx, dy);
}

/**
 * How far each of `chosen` sits from its nearest neighbour among them, averaged.
 *
 * The figure a spread is judged by: a well-distributed set pushes every member away from every
 * other, so the mean nearest-neighbour distance rises, while a set that has clumped leaves most of
 * its members touching and the figure falls towards 1.
 */
export function meanNearest(size: number, chosen: readonly number[]): number {
  let total = 0;
  for (const one of chosen) {
    let nearest = Infinity;
    for (const other of chosen) {
      if (other === one) continue;
      nearest = Math.min(nearest, separation(size, one, other));
    }
    total += nearest;
  }
  return total / chosen.length;
}

/**
 * A seeded scatter of `wanted` distinct positions in a `size`-square tile — what a spread is
 * measured against.
 *
 * A comparison rather than a fixed threshold, so a test says what a ranking is *for* — an even
 * spread — rather than pinning a number nobody could re-derive. Seeded so it cannot flake, and read
 * from the generator's high bits because an LCG's low bits cycle far too short to be a scatter at
 * all.
 */
export function scatter(size: number, wanted: number, seed: number): number[] {
  const positions = new Set<number>();
  let state = seed;
  while (positions.size < wanted) {
    state = (state * 1664525 + 1013904223) >>> 0;
    positions.add((state >>> 8) % (size * size));
  }
  return [...positions];
}
