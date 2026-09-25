import type { Oklab } from './oklab.ts';

/**
 * Points in scaled OKLab filed by the cell of a `reach`-sized lattice they sit in, so that every point
 * within `reach` of a colour is found in the twenty-seven cells around it rather than by a scan of
 * every point filed.
 *
 * Two passes ask that question of a set large enough for the scan to be the cost. `mergeColors` asks
 * it of every keeper so far, once per distinct colour of the sheet, and the plain quadratic scan
 * measured a quarter of a minute on a sheet quantised at a grid of 1. `lockReach` asks it of a
 * palette lock, once per distinct colour of each later sheet, where a scan over every held entry
 * made one transform take half a minute. One lattice rather than two copies of the walk, because the
 * packing below is easy to get subtly wrong and a second spelling of it is a second place to do so.
 *
 * **What it returns is a superset.** Any point within `reach` of another differs by at most one cell
 * on each axis, so the walk is exhaustive, but a corner cell also holds points up to `reach × √12`
 * away. The caller measures the exact distance and applies its own threshold, and the lattice decides
 * nothing about nearness.
 */
export interface OklabLattice<T> {
  /** Files `item` at `point`. */
  add(point: Oklab, item: T): void;
  /**
   * Replaces the contents of `into` with every item filed in the twenty-seven cells around `point`,
   * in no set order. A buffer the caller keeps rather than a new array, because both callers ask once
   * per distinct colour of a sheet that can carry hundreds of thousands.
   */
  near(point: Oklab, into: T[]): void;
}

/**
 * `AXIS_LIFT` moves the two chroma axes, which run to about −80, into positive cell space, and
 * `CELL_STRIDE` packs the three cell indices into one number. The packing is linear, so a neighbour's
 * key is always this key plus a fixed offset. That keeps the walk exhaustive even at a reach small
 * enough for an index to pass the stride, where colliding cells only add candidates the caller's
 * exact distance test then rejects.
 */
const AXIS_LIFT = 128;
const CELL_STRIDE = 1024;

/** An empty lattice of `reach`-sized cells, which must be a positive, finite distance. */
export function oklabLattice<T>(reach: number): OklabLattice<T> {
  if (!(reach > 0) || !Number.isFinite(reach)) {
    throw new RangeError(`An OKLab lattice needs a positive reach, not ${String(reach)}.`);
  }
  const cells = new Map<number, T[]>();
  const cellOf = (point: Oklab): number =>
    (Math.floor((point.L + AXIS_LIFT) / reach) * CELL_STRIDE + Math.floor((point.a + AXIS_LIFT) / reach)) *
      CELL_STRIDE +
    Math.floor((point.b + AXIS_LIFT) / reach);

  return {
    add(point, item) {
      const key = cellOf(point);
      const cell = cells.get(key);
      if (cell === undefined) cells.set(key, [item]);
      else cell.push(item);
    },
    near(point, into) {
      into.length = 0;
      const key = cellOf(point);
      for (let dL = -1; dL <= 1; dL += 1) {
        for (let dA = -1; dA <= 1; dA += 1) {
          for (let dB = -1; dB <= 1; dB += 1) {
            const cell = cells.get(key + (dL * CELL_STRIDE + dA) * CELL_STRIDE + dB);
            if (cell === undefined) continue;
            for (const item of cell) into.push(item);
          }
        }
      }
    },
  };
}
