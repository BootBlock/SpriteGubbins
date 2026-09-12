import type { GridMesh, PixelGrid } from '../types/quantiser.ts';
import { bestPhase } from './bestPhase.ts';
import { boundaryClusters } from './boundaryClusters.ts';
import { boundEndCells } from './boundEndCells.ts';
import { edgeLattice, exactGridOffset } from './edgeLattice.ts';
import { type BoundaryEvidence, stepProfile } from './stepProfile.ts';

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
 * **Where the sheet is exactly a grid of this scale, the mesh is that grid's lattice and nothing is
 * walked.** {@link exactGridOffset} asks the exact detector's own question of the grid in force —
 * whether nine tenths of the sheet's colour transitions fall on one phase class of it — and where
 * they do, the cuts are that phase class. The walk exists for drift, and an exact sheet has none: art
 * whose blocks wandered would spread its transitions over several phase classes and fall under the
 * threshold. Walking one anyway was a second opinion that could only disagree, and it did. The walk
 * then read its lines by the *magnitude* of each column's change where the detector counts
 * transitions, so a crisp 40 × 40 sheet drawn at 4 — faint cell boundaries, and a strong stray pixel in
 * twenty of its interior cells — was read as exactly 4 and then cut on the strays, two pixels beside
 * every boundary, reducing to 9 × 10 where the art is 10 × 10. Over 461 such sheets, anchored at the
 * corner and read as exact at grids of 2, 3, 4, 5, 6 and 8, 285 were walked off the lattice they had
 * been read on, and 46 reduced to a different image from the same art without its strays: a column
 * short at 4, a column over at 6 and 8, and the right size with the wrong pixels at 2.
 *
 * **The question is asked of the grid, not of how the grid arrived**, so a typed or clicked grid the
 * sheet is exactly drawn on takes the lattice exactly as an adopted reading does, and this stays the
 * one mechanism serving all three. **A grid the sheet is not exactly drawn on is still walked, and on
 * crisp art the walk now reads what the detector reads.** Twenty-one strays in the same sheet put the
 * lattice of 4 under nine tenths, so a typed 4 is walked — and while the walk read its lines by
 * magnitude it cut on the strays exactly as before. A crisp axis's lines are read by its transitions
 * now (`stepProfile` argues when an axis is crisp), so a stray is one transition on a few lines and a
 * boundary one on nearly every line, and the walk lands on the lattice from twenty-one strays to every
 * interior cell (#279).
 *
 * **The pitch in force is the prior, not the answer.** Where the sheet is not exact, detected lines
 * are accepted only where they sit close to the position the previous accepted line expects — at most
 * a third of a cell away, never less than one pixel — so a strong edge in the middle of a cell cannot
 * pull a cut off the grid mid-walk, and each accepted line re-anchors the expectation, which is what
 * lets the mesh follow drift instead of accumulating against it. Where no line is found near the
 * expected position the mesh completes one there: a boundary too faint to detect is almost certainly
 * at the spacing, and a *missing* cut would merge two of the art's cells for good. How the walk's own
 * starting point is chosen — the other way interior detail could take the axis — is `meshAxis`'s own
 * story below.
 *
 * On an axis with too few detectable boundaries to anchor a walk at all — a flat field, a gradient,
 * heavy noise — it falls back to the regular lattice at `bestPhase`'s answer, which is the best single
 * placement the profile supports; the phase is computed from the one profile this function already
 * walked, and only for an axis that actually needs it.
 *
 * **The transition count is taken first because it can answer before the profile is needed.** An
 * exact sheet pays for that one cheap pass and never for the step profile; any other sheet pays for
 * both, and the count is one pack and two comparisons a pixel against the profile's eight channel
 * subtractions.
 */
export function boundaryMesh(image: ImageData, grid: PixelGrid): GridMesh {
  if (grid <= 1) {
    return {
      x: Array.from({ length: image.width }, (_, index) => index),
      y: Array.from({ length: image.height }, (_, index) => index),
    };
  }
  const exact = exactGridOffset(edgeLattice(image), grid);
  if (exact !== null) return regularMesh(image.width, image.height, grid, exact);

  const profile = stepProfile(image);
  return {
    x: meshAxis(profile.columnEvidence, image.width, grid),
    y: meshAxis(profile.rowEvidence, image.height, grid),
  };
}

/**
 * The mesh of a regular lattice: pitch `grid`, first interior line at `offset` on each axis.
 *
 * What {@link boundaryMesh} returns for a sheet exactly drawn on that lattice, the fallback it reaches
 * for when an axis holds too few boundaries to anchor a walk — and, for the first of those reasons,
 * the right fixture for tests that are about the transforms rather than the measurement.
 *
 * It is held to the same end-cell bound the measured mesh is, deliberately: a fixture that can
 * express a mesh the app is unable to produce is a fixture testing a fiction. So an `offset` of one
 * or two pixels, or an `extent` leaving a band that short at the far end, comes back with that band
 * merged into the cell beside it rather than standing as a cell of its own — see `boundEndCells`.
 */
export function regularMesh(
  width: number,
  height: number,
  grid: PixelGrid,
  offset: { x: number; y: number },
): GridMesh {
  return { x: regularStarts(width, grid, offset.x), y: regularStarts(height, grid, offset.y) };
}

/** Cell starts for one axis at a regular pitch and phase — the exact case, and the fallback. */
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
 * transitions — where the exact branch of {@link boundaryMesh} no longer takes the sheet away from this
 * walk — the walk cut on them (#279). A crisp axis is read by its transitions now, where a stray is a
 * few lines' worth beside a boundary's nearly every line, and `boundaryClusters` splits a run at its
 * valleys so a stray's transitions touching a boundary do not drag its line off it.
 *
 * **The result is strictly ascending by construction, and nothing needs to re-check it.** Every
 * forward step accepts a position within `tolerance` of the previous one plus `grid`, and
 * `grid − tolerance ≥ 1` at every grid this takes — so each accepted position exceeds its
 * predecessor by at least one, and the backward walk decreases the same way and stops before 1.
 * `boundEndCells` closes the axis off at 0 without disturbing that: it either prepends 0
 * below a first cut of at least three, or moves that first cut down to 0, and both sit strictly
 * below the cut after them. A dedupe pass here would be a guard against a state
 * the arithmetic rules out, wearing the look of handling it.
 */
function meshAxis(evidence: BoundaryEvidence, extent: number, grid: PixelGrid): number[] {
  const axis = evidence.values;
  const lines = boundaryClusters(evidence).filter((line) => line.position < extent);
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
