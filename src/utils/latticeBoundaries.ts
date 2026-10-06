import { lineCentres } from './lineCentres.ts';

/** An occupied run along one axis, start inclusive and end exclusive, in the sheet's drawn pixels. */
type Span = readonly [number, number];

/**
 * The inner boundaries of one axis of a near-regular grid, read from the empty runs between the pieces
 * on it, or the boundary no empty run was found for.
 *
 * **Each boundary is looked for near its nominal place, `k × step`, within a quarter of a step either
 * side.** A generated sheet's cells drift a few percent from the grid the prompt states, so a boundary
 * read off the nominal grid alone would cut a piece near it in two; the gap between pieces is where the
 * cell ends.
 *
 * **Where the gap lies wholly inside that window, the boundary is its middle**: the pieces on both sides
 * reach to within a quarter step of it, which on a sheet of centred tile squares is their square's edge,
 * so the gap is even about the boundary. **Where the gap runs past the window** — a row of top-corner
 * badges above a row of bottom-corner marks, or an empty cell — its middle could sit half a cell away,
 * so the boundary is the point of the gap nearest where the line through the even gaps found so far
 * puts it (`lineCentres`): a step on from the one even gap, or `k × step` before any.
 *
 * **The line has an origin as well as a pitch.** A generator draws its whole sheet a few pixels off
 * the grid the prompt states (twelve down on the first real overlay sheet), so an even gap is the
 * cell's edge but not `k` cells from the sheet's edge; a pitch read as the gap's place over `k` took
 * an offset for a narrower cell and placed every boundary after it that much further off.
 *
 * **Absolute rather than chained from the boundary before it**, so one boundary does not carry its error
 * to every boundary after it. It reads on while a piece's centre lies past the window of the next
 * boundary, so the count of boundaries is the count of cells the pieces reach, less one. Pure.
 */
export function latticeBoundaries(
  spans: readonly Span[],
  centres: readonly number[],
  step: number,
): { readonly inner: readonly number[]; readonly missing: number | null } {
  const reach = step / 4;
  const inner: number[] = [];
  const even = new Map<number, readonly number[]>();
  for (let k = 1; centres.some((centre) => centre > k * step - reach); k += 1) {
    const expected = lineCentres(even, step)(k) ?? k * step;
    const found = boundaryNear(spans, k * step, reach, expected);
    if (found === null) return { inner, missing: k * step };
    if (found.even) even.set(k, [found.at]);
    inner.push(found.at);
  }
  return { inner, missing: null };
}

/**
 * The boundary in the empty runs within `target ± reach`, nearest `target`: an even run's middle, or the
 * point of an uneven one nearest `expected`. `null` where the window holds no empty run.
 */
function boundaryNear(
  spans: readonly Span[],
  target: number,
  reach: number,
  expected: number,
): { readonly at: number; readonly even: boolean } | null {
  const low = target - reach;
  const high = target + reach;
  const within = spans.filter(([start, end]) => end > low && start < high).sort((a, b) => a[0] - b[0]);
  let best: { readonly at: number; readonly even: boolean } | null = null;
  const consider = (start: number, end: number): void => {
    if (end <= start) return;
    const even = start > low && end < high;
    const at = even ? (start + end) / 2 : Math.min(Math.max(expected, start), end);
    if (best === null || Math.abs(at - target) < Math.abs(best.at - target)) best = { at, even };
  };
  let cursor = Number.NEGATIVE_INFINITY;
  for (const [start, end] of within) {
    consider(Math.max(cursor, low), Math.min(start, high));
    cursor = Math.max(cursor, end);
  }
  consider(Math.max(cursor, low), high);
  return best;
}
