import type { GridMesh, PixelGrid } from '../types/quantiser.ts';
import { boundaryClusters } from './boundaryClusters.ts';
import { bestGridOffset } from './gridOffset.ts';
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
 * sit within a third of a cell of the position the previous accepted line expects, so interior
 * detail — a strong edge in the middle of a cell — cannot pull a cut off the grid, and each
 * accepted line re-anchors the expectation, which is what lets the mesh follow drift instead of
 * accumulating against it. Where no line is found near the expected position the mesh completes one
 * there: a boundary too faint to detect is almost certainly at the spacing, and a *missing* cut
 * would merge two of the art's cells for good.
 *
 * On art that is genuinely regular every detected line sits exactly where expected, and the mesh
 * *is* the regular lattice — so the crisp case loses nothing to this measurement. On an image with
 * too few detectable boundaries to anchor a mesh at all — a flat field, a gradient, heavy noise —
 * it falls back to the regular lattice at `bestGridOffset`'s phase, which is the best single answer
 * the profile supports.
 */
export function boundaryMesh(image: ImageData, grid: PixelGrid): GridMesh {
  if (grid <= 1) {
    return {
      x: Array.from({ length: image.width }, (_, index) => index),
      y: Array.from({ length: image.height }, (_, index) => index),
    };
  }
  const profile = stepProfile(image);
  const fallback = bestGridOffset(image, grid);
  return {
    x: meshAxis(profile.columns, image.width, grid, fallback.x),
    y: meshAxis(profile.rows, image.height, grid, fallback.y),
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
 * where they do not, walked from the strongest line so the anchor is the most trustworthy cut.
 */
function meshAxis(axis: Float64Array, extent: number, grid: PixelGrid, fallbackPhase: number): number[] {
  const lines = boundaryClusters(axis).filter((line) => line.position < extent);
  // One line anchors nothing: with no second line there is no spacing observed, and a mesh hung off
  // a single cut is a guess wearing a measurement's confidence. The regular lattice is honest.
  if (lines.length < 2) return regularStarts(extent, grid, fallbackPhase);

  const tolerance = Math.max(1, Math.floor(grid / 3));
  let anchor = lines[0];
  for (const line of lines) {
    if (anchor === undefined || line.mass > anchor.mass) anchor = line;
  }
  if (anchor === undefined) return regularStarts(extent, grid, fallbackPhase);

  const accepted: number[] = [anchor.position];
  // Forwards from the anchor, each accepted line re-anchoring the expectation.
  let expected = anchor.position + grid;
  while (expected < extent) {
    const found = nearestLine(lines, expected, tolerance);
    const position = found ?? expected;
    accepted.push(position);
    expected = position + grid;
  }
  // Backwards to the leading edge, the same way.
  expected = (accepted[0] ?? 0) - grid;
  while (expected >= 1) {
    const found = nearestLine(lines, expected, tolerance);
    const position = found ?? expected;
    accepted.unshift(position);
    expected = position - grid;
  }

  const starts = accepted[0] === 0 ? accepted : [0, ...accepted];
  return starts.filter((start, index) => index === 0 || start > (starts[index - 1] ?? -1));
}

/** The detected line nearest `expected` within `tolerance`, or `null` where none sits that close. */
function nearestLine(
  lines: readonly { position: number }[],
  expected: number,
  tolerance: number,
): number | null {
  let best: number | null = null;
  let bestDistance = tolerance + 1;
  for (const line of lines) {
    const distance = Math.abs(line.position - expected);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = line.position;
    }
  }
  return best;
}
