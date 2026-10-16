import type { PixelGrid } from '../types/quantiser.ts';
import { axisTolerance } from './axisTolerance.ts';
import { boundaryClusters } from './boundaryClusters.ts';

/**
 * How short of the evidence's total the resultant may fall before the offsets are called
 * directionless — a floating-point allowance, as `CANCELLED_SHARE` is in `bestPhase.ts`.
 */
const CANCELLED_SHARE = 1e-9;

/**
 * One axis of one patch: the mesh's cuts over a sprite, moved to where that sprite's cells are.
 *
 * `cuts` are the mesh's own cuts across the patch, in source pixels, and `end` is where the patch's
 * last cell ends. `evidence` is the patch's own boundary evidence along this axis, index 0 at
 * `cuts[0]` — `stepProfile` over the patch alone, so no other sprite's lines are in it. The answer has
 * as many cuts as `cuts`, starts on `cuts[0]` and ends before `end`: a patch never changes how many
 * cells there are or where it meets the rest of the mesh.
 *
 * **First, the whole run of interior cuts shifts to the sprite's own phase.** Every position votes,
 * by its evidence, for its offset from the nearest cut, as a point on a circle one cell round; the
 * angle of the sum is the offset the sprite's boundaries are centred on, which is where its cells
 * begin when the sheet's cuts belong to a sprite drawn at another phase. It is `bestPhase`'s
 * reading, taken against the cuts the mesh already has rather than against a lattice from 0, so it
 * works on a mesh that drifts. The two edge cells take up the difference, and they lie in the field
 * `PATCH_MARGIN_CELLS` leaves around the sprite. An edge cell may shrink to half a cell and no
 * further (or not at all, where it was already narrower): the shift is at most half a cell, so a cell
 * of the grid's width can always take it, and a narrower edge cell — the sheet's own end band, where a
 * sprite sits near the image's edge — pulls the shift back rather than being squeezed to a sliver.
 * Held to `grid − tolerance` instead, as the walk's own cells are, an edge cell would hold every shift
 * to the window, and a sprite half a cell out of phase could not be reached.
 *
 * **Then each cut snaps to the nearest line of the sprite within the walk's window**, wherever both
 * cells beside it stay within `grid ± tolerance` (or, for an edge cell, no narrower than half a
 * cell). The shift places the sprite's lattice as a whole, and the snap follows the sprite's own
 * drift across it one cut at a time, without letting any cut leave its neighbours' spacing. Cuts are
 * snapped left to right, each against the one already placed before it.
 */
export function patchAxis(
  cuts: readonly number[],
  end: number,
  evidence: Float64Array,
  grid: PixelGrid,
): number[] {
  if (cuts.length < 2) return [...cuts];
  const tolerance = axisTolerance(grid);
  const origin = cuts[0] ?? 0;
  const narrowest = grid - tolerance;
  const edgeFloor = (width: number): number => Math.min(width, Math.ceil(grid / 2));
  const firstWidth = (cuts[1] ?? end) - origin;
  const lastWidth = end - (cuts[cuts.length - 1] ?? end);

  let shift = phaseShift(cuts, end, evidence, grid);
  while (shift < 0 && firstWidth + shift < edgeFloor(firstWidth)) shift += 1;
  while (shift > 0 && lastWidth - shift < edgeFloor(lastWidth)) shift -= 1;
  const placed = cuts.map((cut, index) => (index === 0 ? cut : cut + shift));
  if (tolerance === 0) return placed;

  const last = placed.length - 1;
  const fits = (width: number, edge: boolean, before: number): boolean =>
    edge ? width >= edgeFloor(before) : width >= narrowest && width <= grid + tolerance;
  const lines = boundaryClusters(evidence).map((line) => line.position + origin);
  for (let index = 1; index <= last; index += 1) {
    const at = placed[index] ?? 0;
    const line = nearestWithin(lines, at, tolerance);
    if (line === null || line === at) continue;
    const previous = placed[index - 1] ?? origin;
    const following = placed[index + 1] ?? end;
    if (
      fits(line - previous, index === 1, at - previous) &&
      fits(following - line, index === last, following - at)
    ) {
      placed[index] = line;
    }
  }
  return placed;
}

/**
 * The circular mean of the evidence's offsets from the nearest cut, rounded to a whole pixel, or 0
 * where the offsets cancel. The cuts, the patch's far edge included, are walked with one cursor,
 * since the positions arrive ascending.
 */
function phaseShift(cuts: readonly number[], end: number, evidence: Float64Array, grid: PixelGrid): number {
  const origin = cuts[0] ?? 0;
  const edges = [...cuts, end];
  let cursor = 0;
  let total = 0;
  let cosine = 0;
  let sine = 0;
  for (let index = 1; index < evidence.length; index += 1) {
    const weight = evidence[index] ?? 0;
    if (weight === 0) continue;
    const position = origin + index;
    while (cursor + 1 < edges.length && (edges[cursor + 1] ?? Infinity) <= position) cursor += 1;
    const below = position - (edges[cursor] ?? origin);
    const above = (edges[cursor + 1] ?? Infinity) - position;
    const offset = above < below ? -above : below;
    const angle = (2 * Math.PI * offset) / grid;
    total += weight;
    cosine += weight * Math.cos(angle);
    sine += weight * Math.sin(angle);
  }
  if (Math.hypot(cosine, sine) <= total * CANCELLED_SHARE) return 0;
  return Math.round((Math.atan2(sine, cosine) * grid) / (2 * Math.PI));
}

/** The line nearest `at` within `tolerance`, the lower of two equally near, or `null` where none is. */
function nearestWithin(lines: readonly number[], at: number, tolerance: number): number | null {
  let found: number | null = null;
  for (const line of lines) {
    if (line > at + tolerance) break;
    if (Math.abs(line - at) <= tolerance && (found === null || Math.abs(line - at) < Math.abs(found - at))) {
      found = line;
    }
  }
  return found;
}
