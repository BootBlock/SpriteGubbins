import type { GridMesh, PixelGrid } from '../types/quantiser.ts';
import { bestPhase } from './bestPhase.ts';
import { boundaryClusters } from './boundaryClusters.ts';
import { stepProfile } from './stepProfile.ts';

/**
 * Where the cells of a chosen scale actually begin on this sheet.
 *
 * Generated art **drifts**: its apparent blocks repeat at almost the chosen pitch but not exactly,
 * so any single lattice — whatever its offset — walks out of register with the art within a few
 * cells, and every cell it then resolves straddles two of the art's own. That is the difference
 * between the messy result a drifting sheet quantises to under a fixed pitch and the clean one the
 * same sheet gives when each cut lands on a measured boundary — which is what the tools this
 * follows do: measure the boundaries, snap the cuts to them, and fill the gaps at the expected
 * spacing.
 *
 * **The pitch in force is the prior, not the answer.** Detected lines are accepted only where they
 * sit close to the position the previous accepted line expects — at most a third of a cell away,
 * never less than one pixel — so a strong edge in the middle of a cell cannot pull a cut off the
 * grid mid-walk, and each accepted line re-anchors the expectation, which is what lets the mesh
 * follow drift instead of accumulating against it. Where no line is found near the expected
 * position the mesh completes one there: a boundary too faint to detect is almost certainly at the
 * spacing, and a *missing* cut would merge two of the art's cells for good. How the walk's own
 * starting point is chosen — the other way interior detail could take the axis — is `meshAxis`'s
 * own story below.
 *
 * On art that is genuinely regular every detected line sits exactly where expected, and the mesh
 * *is* the regular lattice — so the crisp case loses nothing to this measurement. On an axis with
 * too few detectable boundaries to anchor a mesh at all — a flat field, a gradient, heavy noise —
 * it falls back to the regular lattice at `bestPhase`'s answer, which is the best single placement
 * the profile supports; the phase is computed from the one profile this function already walked,
 * and only for an axis that actually needs it.
 */
export function boundaryMesh(image: ImageData, grid: PixelGrid): GridMesh {
  if (grid <= 1) {
    return {
      x: Array.from({ length: image.width }, (_, index) => index),
      y: Array.from({ length: image.height }, (_, index) => index),
    };
  }
  const profile = stepProfile(image);
  return {
    x: meshAxis(profile.columns, image.width, grid),
    y: meshAxis(profile.rows, image.height, grid),
  };
}

/**
 * The mesh of a regular lattice: pitch `grid`, first interior line at `offset` on each axis.
 *
 * The fallback {@link boundaryMesh} reaches for when an image holds too few boundaries to anchor a
 * measured mesh, and the mesh the crisp case measures out to — which is also what makes it the
 * right fixture for tests that are about the transforms rather than the measurement.
 */
export function regularMesh(
  width: number,
  height: number,
  grid: PixelGrid,
  offset: { x: number; y: number },
): GridMesh {
  return { x: regularStarts(width, grid, offset.x), y: regularStarts(height, grid, offset.y) };
}

/** Cell starts for one axis at a regular pitch and phase — the fallback, and the crisp case. */
function regularStarts(extent: number, grid: PixelGrid, offset: number): number[] {
  const starts: number[] = [];
  if (offset > 0) starts.push(0);
  for (let start = offset; start < extent; start += grid) starts.push(start);
  return starts;
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
 * **The result is strictly ascending by construction, and nothing needs to re-check it.** Every
 * forward step accepts a position within `tolerance` of the previous one plus `grid`, and
 * `grid − tolerance ≥ 1` at every grid this takes — so each accepted position exceeds its
 * predecessor by at least one, the backward walk decreases the same way and stops before 1, and the
 * prepended 0 sits strictly below the first accepted line. A dedupe pass here would be a guard
 * against a state the arithmetic rules out, wearing the look of handling it.
 */
function meshAxis(axis: Float64Array, extent: number, grid: PixelGrid): number[] {
  const lines = boundaryClusters(axis).filter((line) => line.position < extent);
  // One line anchors nothing: with no second line there is no spacing observed, and a mesh hung off
  // a single cut is a guess wearing a measurement's confidence. The regular lattice is honest.
  if (lines.length < 2) return regularStarts(extent, grid, bestPhase(axis, grid));

  let best: AxisWalk | null = null;
  for (const anchor of lines) {
    const walk = walkFrom(anchor.position, lines, extent, grid);
    if (best === null || walk.fit > best.fit || (walk.fit === best.fit && walk.mass > best.mass)) {
      best = walk;
    }
  }
  if (best === null) return regularStarts(extent, grid, bestPhase(axis, grid));

  const accepted = best.starts;
  return accepted[0] === 0 ? accepted : [0, ...accepted];
}

/** One anchor's walk: the cuts it takes, and the evidence — the closeness score and captured mass. */
interface AxisWalk {
  readonly starts: number[];
  readonly fit: number;
  readonly mass: number;
}

/** The walk from one anchor: forwards then backwards, each accepted cut re-anchoring the next. */
function walkFrom(
  anchor: number,
  lines: readonly { position: number; mass: number }[],
  extent: number,
  grid: PixelGrid,
): AxisWalk {
  const tolerance = Math.max(1, Math.floor(grid / 3));
  const starts: number[] = [anchor];
  let fit = 0;
  let mass = 0;
  const capture = (line: { position: number; mass: number } | null, expected: number) => {
    if (line === null) return;
    // A square landing scores tolerance + 1; a capture at the very edge of tolerance scores 1.
    fit += tolerance + 1 - Math.abs(line.position - expected);
    mass += line.mass;
  };
  capture(lines.find((line) => line.position === anchor) ?? null, anchor);

  let expected = anchor + grid;
  while (expected < extent) {
    const found = nearestLine(lines, expected, tolerance);
    capture(found, expected);
    const position = found?.position ?? expected;
    starts.push(position);
    expected = position + grid;
  }
  expected = anchor - grid;
  while (expected >= 1) {
    const found = nearestLine(lines, expected, tolerance);
    capture(found, expected);
    const position = found?.position ?? expected;
    starts.unshift(position);
    expected = position - grid;
  }

  return { starts, fit, mass };
}

/** The detected line nearest `expected` within `tolerance`, or `null` where none sits that close. */
function nearestLine(
  lines: readonly { position: number; mass: number }[],
  expected: number,
  tolerance: number,
): { position: number; mass: number } | null {
  let best: { position: number; mass: number } | null = null;
  let bestDistance = tolerance + 1;
  for (const line of lines) {
    const distance = Math.abs(line.position - expected);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = line;
    }
  }
  return best;
}
