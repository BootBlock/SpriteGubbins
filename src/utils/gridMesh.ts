import type { GridMesh, PixelGrid } from '../types/quantiser.ts';
import { edgeLattice, exactGridOffset } from './edgeLattice.ts';
import { meshAxis } from './meshAxis.ts';
import { regularStarts } from './regularStarts.ts';
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
 * starting point is chosen — the other way interior detail could take the axis — is {@link meshAxis}'s own
 * story.
 *
 * On an axis with too few detectable boundaries to anchor a walk at all — a flat field, a gradient,
 * heavy noise, dense detail that never stands clear of its background — it falls back to the regular
 * lattice at `bestPhase`'s answer, the phase the axis's change is centred on; the phase is computed
 * from the one profile this function already walked, and only for an axis that actually needs it.
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
