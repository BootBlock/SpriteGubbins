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
 *
 * It is held to the same end-cell bound the measured mesh is, deliberately: a fixture that can
 * express a mesh the app is unable to produce is a fixture testing a fiction. So an `offset` of one
 * or two pixels, or an `extent` leaving a band that short at the far end, comes back with that band
 * merged into the cell beside it rather than standing as a cell of its own — see
 * {@link boundEndCells}.
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
  for (let start = offset; start < extent; start += grid) starts.push(start);
  // An offset at or past the extent puts no cut on the axis at all, and an axis of no cells is a
  // zero-dimension result rather than a small one — `ImageData` throws on it. The image's own edge
  // bounds one cell whatever the phase, so that is the floor.
  return starts.length === 0 ? [0] : boundEndCells(starts, extent, grid);
}

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
 * The narrowest an end cell may be: three source pixels, or the whole cell at a grid below that.
 *
 * **An absolute floor rather than a fraction of the grid**, because what is wrong with a one-pixel
 * end band is absolute. `downscaleNearest` gives every cell one output pixel, so a band of one or
 * two source pixels stands in the result exactly as wide as a full cell — and one or two pixels is
 * not a band of anything: it is the backward walk stopping short of the edge, or the extent failing
 * to divide by the pitch.
 *
 * **A proportional floor would take content with it, and that is the mistake this number avoids.** A
 * margin the generator inset deliberately is content the reader paid for, at any width — art three
 * pixels in from the corner at a grid of 8 is a case `quantiseImage.test.ts` states outright — and
 * `grid − tolerance` would be 6 there, folding that margin into the art's own first cell and losing
 * a cell of the sprite. Three is the smallest run that can hold a boundary and an interior, so it is
 * the line below which a band cannot be a cell of artwork at any grid.
 *
 * `grid − 1` caps it, because at a grid of 2 or 3 the floor would otherwise reach a whole cell.
 */
function shortestEndCell(grid: PixelGrid): number {
  return Math.min(SHORTEST_END_BAND, grid - 1);
}

/** See {@link shortestEndCell} — an end band of fewer source pixels than this is not a cell. */
const SHORTEST_END_BAND = 3;

/**
 * The axis closed off at both ends, with an end cell too narrow to be a cell merged into its
 * neighbour.
 *
 * **A partial cell at either end is content and is never cropped** — the art a generator inset from
 * the corner is no more disposable than the art it cut short at the far edge. But `downscaleNearest`
 * emits **one output pixel per cell**, so a band of one or two source pixels would carry the same
 * weight in the result as a full cell, and the result would no longer be a reduction at one scale.
 * Both ends can produce one: the walk's backward loop stops at a position between 1 and `grid − 1`,
 * and the far edge closes the last cell wherever the extent happens to fall. Measured over the eight
 * sheets in `test_sprites/` at a grid of 6, **thirteen of the sixteen** sheet-and-keying combinations
 * had a band of one or two pixels at one end or the other, and eight of them had one at the *leading*
 * end. `armour.png` shows both ends doing it separately: unkeyed, its x axis ended on a two-pixel
 * band, which is the whole of why a 1254 × 1254 sheet came back 210 × 209; keyed, its y axis carried
 * a one-pixel band at *each* end, which is the 212.
 *
 * So a short end band is **merged** into the cell beside it rather than kept or dropped: its pixels
 * stay in the sheet and vote in that cell's tally, weighted by the area they actually cover. The
 * leading merge moves the first cut down to the image edge; the trailing merge drops the last cut
 * and lets the edge close the cell before it. Nothing is deleted, and no output pixel stands for a
 * band narrower than {@link shortestEndCell} — which is where the line is drawn, and why.
 *
 * **What this buys is an invariant the whole pipeline can be read against**: every interior cell is
 * within tolerance of the grid, and an end cell holds at least {@link shortestEndCell} source pixels
 * — three at every grid from 4 up, and the whole cell at a grid of 2 or 3, where nothing can be
 * merged without swallowing one. Its upper bound is `grid + tolerance + 2 × (shortest − 1)`, because
 * on an axis short enough to hold a single full cell **both** bands merge into that one cell; the
 * corpus never reaches it, and `regularMesh(8, 8, 4, { x: 2, y: 2 })` does.
 *
 * It does *not* make the result's dimensions a function of the source and the grid alone — a mesh
 * that follows drift honestly resolves a different number of cells on a keyed sheet than on the same
 * sheet unkeyed, because each cut may move within tolerance and re-anchor there. That difference is
 * the measurement working; a one-pixel band was not.
 */
function boundEndCells(starts: readonly number[], extent: number, grid: PixelGrid): number[] {
  const first = starts[0];
  if (first === undefined) return [];
  const shortest = shortestEndCell(grid);
  const bounded = first === 0 ? [...starts] : first < shortest ? [0, ...starts.slice(1)] : [0, ...starts];

  const last = bounded[bounded.length - 1];
  // A one-cell axis has no neighbour to merge into, and its single cell is the whole extent.
  if (bounded.length > 1 && last !== undefined && extent - last < shortest) bounded.pop();
  return bounded;
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
 * predecessor by at least one, and the backward walk decreases the same way and stops before 1.
 * {@link boundEndCells} closes the axis off at 0 without disturbing that: it either prepends 0
 * below a first cut of at least three, or moves that first cut down to 0, and both sit strictly
 * below the cut after them. A dedupe pass here would be a guard against a state
 * the arithmetic rules out, wearing the look of handling it.
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

  return boundEndCells(best.starts, extent, grid);
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
  const tolerance = axisTolerance(grid);
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
