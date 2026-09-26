import type { PixelGrid } from '../types/quantiser.ts';
import { bestPhase } from './bestPhase.ts';
import { type BoundaryLine, boundaryClusters } from './boundaryClusters.ts';
import { boundEndCells } from './boundEndCells.ts';
import { regularStarts } from './regularStarts.ts';

/**
 * How far a cut may sit from where the walk expected it.
 *
 * `walkFrom` accepts a detected line within this of the expected position and re-anchors on it, so
 * every interior cell it produces is between `grid − tolerance` and `grid + tolerance` wide.
 */
function axisTolerance(grid: PixelGrid): number {
  return Math.max(1, Math.floor(grid / 3));
}

/**
 * One axis's cell starts: detected boundary lines where they agree with the pitch, completed lines
 * where they do not.
 *
 * **Every detected line is tried as the anchor, and the walk that fits the lines best wins.** The
 * obvious anchor — the single strongest line — is exactly the wrong one on the sheets this exists
 * for: a high-contrast interior edge can out-mass every true boundary, and a walk anchored on it
 * compounds the error cut by cut. What separates a boundary from interior detail is not strength
 * but *periodicity* — the true lattice's lines capture one another squarely when walked from any
 * of their number — so each capture scores by how close it sits to where the walk expected it, and
 * the walk with the highest score takes the axis. A count alone is not enough: a hijacking walk
 * can vacuum true lines at the very edge of its tolerance and tie the count, but it cannot land on
 * them squarely, which is what the closeness score reads. Captured mass breaks remaining ties, and
 * the earlier anchor after that, for determinism.
 *
 * **Periodicity cannot separate them where the detail is periodic too**, which is why the line list
 * this walks has to be the boundaries' in the first place. Stray pixels at one offset within their
 * cells repeat at the pitch exactly as the boundaries do, so a list holding the strays makes every walk
 * a walk over the strays, and the best of them lands squarely on the wrong lattice. Read by magnitude,
 * crisp strays that outweighed faint boundaries *were* that list, and past a tenth of the sheet's
 * transitions — where the exact branch of `boundaryMesh` no longer takes the sheet away from this
 * walk — the walk cut on them (#279). A crisp axis is read by its transitions now, where a stray is a
 * few lines' worth beside a boundary's nearly every line, and on every sheet the stray sweep in
 * `tests/exact-scale-interior-cuts.test.ts` reads, the walk lands on the art's own lattice.
 *
 * **The result is strictly ascending by construction, and nothing needs to re-check it.** Every
 * forward step accepts a position within `tolerance` of the previous one plus `grid`, and
 * `grid − tolerance ≥ 1` at every grid this takes — so each accepted position exceeds its
 * predecessor by at least one, and the backward walk decreases the same way and stops before 1.
 * `boundEndCells` closes the axis off at 0 without disturbing that: it either prepends 0
 * below a first cut of at least three, or moves that first cut down to 0, and both sit strictly
 * below the cut after them. A dedupe pass here would be a guard against a state
 * the arithmetic rules out, wearing the look of handling it.
 *
 * **That same monotonicity is what keeps trying every anchor affordable.** The lines arrive
 * ascending, and a walk's expected positions only rise going forwards and only fall going
 * backwards, so each walk keeps a cursor into the lines that moves one way and never rescans them.
 * A walk costs its steps plus the lines it passes, not its steps times every line: a dense noisy
 * axis 4,096 pixels long, with some 1,900 lines at a grid of 2, took ten seconds when each step
 * scanned the whole list (#481).
 */
export function meshAxis(axis: Float64Array, extent: number, grid: PixelGrid): number[] {
  const lines = boundaryClusters(axis).filter((line) => line.position < extent);
  // One line anchors nothing: with no second line there is no spacing observed, and a mesh hung off
  // a single cut is a guess wearing a measurement's confidence. The regular lattice is honest.
  if (lines.length < 2) return regularStarts(extent, grid, bestPhase(axis, grid));

  let best: AxisWalk | null = null;
  for (const [index, anchor] of lines.entries()) {
    const walk = walkFrom(anchor, index, lines, extent, grid);
    if (best === null || walk.fit > best.fit || (walk.fit === best.fit && walk.mass > best.mass)) {
      best = walk;
    }
  }
  if (best === null) return regularStarts(extent, grid, bestPhase(axis, grid));

  return boundEndCells(best.starts, extent, grid);
}

/** One anchor's walk: the cuts it takes, and the evidence — the closeness score and captured mass. */
interface AxisWalk {
  readonly starts: number[];
  readonly fit: number;
  readonly mass: number;
}

/**
 * The walk from one anchor: forwards then backwards, each accepted cut re-anchoring the next.
 *
 * `low` indexes the first line at or above `expected − tolerance`, the lowest line a step may take.
 * Going forwards that bound only rises, so `low` only advances; going backwards it only falls, so
 * `low` only retreats. Both walks start it at the anchor's own index, since every line below the
 * anchor sits below the first forward bound, and the anchor itself sits above the first backward one.
 */
function walkFrom(
  anchor: BoundaryLine,
  anchorIndex: number,
  lines: readonly BoundaryLine[],
  extent: number,
  grid: PixelGrid,
): AxisWalk {
  const tolerance = axisTolerance(grid);
  // The anchor is one of the lines, and it lands on itself squarely.
  let fit = tolerance + 1;
  let mass = anchor.mass;
  const step = (low: number, expected: number): number => {
    const found = nearestLine(lines, low, expected, tolerance);
    if (found === null) return expected;
    // A square landing scores tolerance + 1; a capture at the very edge of tolerance scores 1.
    fit += tolerance + 1 - Math.abs(found.position - expected);
    mass += found.mass;
    return found.position;
  };

  const after: number[] = [];
  let low = anchorIndex;
  let expected = anchor.position + grid;
  while (expected < extent) {
    while ((lines[low]?.position ?? Infinity) < expected - tolerance) low += 1;
    const position = step(low, expected);
    after.push(position);
    expected = position + grid;
  }
  const before: number[] = [];
  low = anchorIndex;
  expected = anchor.position - grid;
  while (expected >= 1) {
    while ((lines[low - 1]?.position ?? -Infinity) >= expected - tolerance) low -= 1;
    const position = step(low, expected);
    before.push(position);
    expected = position - grid;
  }

  return { starts: [...before.reverse(), anchor.position, ...after], fit, mass };
}

/**
 * The detected line nearest `expected` within `tolerance`, or `null` where none sits that close.
 *
 * `low` indexes the first line at or above `expected − tolerance`, so the candidates are the run
 * from it up to `expected + tolerance`, never more than `2 × tolerance + 1` lines. Scanning upwards
 * and replacing only on a strictly closer line takes the lower of two lines equally near.
 */
function nearestLine(
  lines: readonly BoundaryLine[],
  low: number,
  expected: number,
  tolerance: number,
): BoundaryLine | null {
  let best: BoundaryLine | null = null;
  let bestDistance = tolerance + 1;
  for (let index = low; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === undefined || line.position > expected + tolerance) break;
    const distance = Math.abs(line.position - expected);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = line;
    }
  }
  return best;
}
