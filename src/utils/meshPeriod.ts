import {
  FEWEST_SPACINGS,
  measurableGridCeiling,
  MIN_ESTIMATED_GRID,
  SPACING_AGREEMENT,
} from '../constants/quantiser.ts';
import type { PixelGrid } from '../types/quantiser.ts';
import { boundaryClusters } from './boundaryClusters.ts';
import { spellPitch } from './spellPitch.ts';
import type { StepProfile } from './stepProfile.ts';

/**
 * The scale of art whose blocks repeat at *almost* a period, on a sheet too **small** for the
 * correlation reading to speak about.
 *
 * `detectPixelGrid` needs every transition on one lattice and `estimatePixelGrid` needs nine
 * tenths of the change within a pixel of one, and drifting art satisfies neither: its boundary
 * spacings wander between, say, 6 and 7, so no integer lattice at any phase collects them. What
 * the drift does not destroy is the *typical spacing* — measure where the boundaries actually
 * sit and the gaps between neighbours cluster tightly around the scale the art was drawn at. The
 * median of those gaps names the habit, and the mean of the gaps that keep it is the pitch, which is
 * offered as the whole scale at or below it — see `spellPitch`.
 *
 * **The niche is the small sheet, and this file used to claim the whole corpus.** `ACF_FEWEST_REPEATS`
 * keeps the correlation reading off anything whose pitch fits fewer than eight times across the
 * shorter edge, and a handful of drifting cells across a few dozen pixels is exactly that — boundary
 * spacings that keep a clean habit still speak there, and `meshPeriod.test.ts` holds the sheet that
 * proves it. On a *large* returned sheet it neither fires nor should: across the eight in
 * `test_sprites/` the spacings agree with their own median at 2%, 12%, 15%, 24%, 41%, 47%, 58% and
 * 69%, against the seven tenths {@link SPACING_AGREEMENT} asks for — and on five of the eight the
 * pitch it would offer disagrees with the pitch the sheet was actually drawn at, so an admitting
 * threshold would buy five confident wrong answers to gain three right ones. The constant's own
 * docblock carries the figures; `tests/sheet-scale-corpus.test.ts` re-measures them.
 *
 * **Offered only where the spacings genuinely cluster.** A median exists for any two lines, so
 * the reading demands enough spacings to call a habit — and demands that most of them sit within
 * a pixel of the median, which is the drift a mesh can follow. Wider scatter than that is not a
 * drifting grid, it is an image with edges at assorted distances, and offering any typical gap of
 * them as a scale would hand the user a confident number that means nothing. Both demands are calibrated
 * thresholds and live with the others in `constants/quantiser.ts`.
 *
 * **One shape can double the answer, and it is accepted rather than defended against.** A sheet
 * whose alternate boundaries are too faint to clear the chance threshold shows this reading only
 * every other line, and those gaps keep a habit of twice the true scale. The number is offered
 * under the same hedge as every estimate — clicked and judged against the preview, never adopted —
 * and it is arguably the honest reading of the boundaries the sheet actually shows; the period
 * estimator before this one has the same shape when the visible lines happen to sit on a lattice.
 */

/** The scale a drifting sheet's boundary spacings imply, or `null` where they imply none. */
export function estimateMeshPeriod(profile: StepProfile): PixelGrid | null {
  const axes = [profile.columnEvidence, profile.rowEvidence].map((evidence) =>
    axisSpacings(boundaryClusters(evidence).map((line) => line.position)),
  );
  const spacings = axes.flat();
  if (spacings.length < FEWEST_SPACINGS) return null;

  const sorted = [...spacings].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const { total, count, runs } = agreement(axes, median);
  if (count / spacings.length < SPACING_AGREEMENT) return null;

  // The median names the habit; the pitch is the mean of the spacings that keep it. Drift at 4.75
  // lays spacings of 4 and 5 in the ratio one to three, whose median is 5 — a whole spacing, so
  // no rounding of it could reach the 4 below the pitch — while their mean is the 4.75 the art was
  // drawn at, which `spellPitch` offers as 4.
  //
  // **Whole spacings measure a pitch to a pixel per run of them, and no finer.** Each boundary sits
  // at its cluster's centre rounded to a pixel, so an unbroken run of spacings spans its true
  // length to within one. One end a pixel out turns forty spacings of 6 into thirty-nine and a 5,
  // whose mean falls 1/40 short of 6 — a slip of more than a pixel across a 252-pixel sheet, so
  // the sheet alone would offer 5 for art drawn at 6. A shortfall of no more than a pixel per run is
  // that rounding, and the integer above stands. Counted in whole pixels, so no rounding decides it.
  const extent = Math.max(profile.columns.length, profile.rows.length) - 1;
  const above = Math.ceil(total / count);
  const period = above * count - total <= runs ? above : spellPitch(total / count, extent);
  const ceiling = measurableGridCeiling(profile.columns.length, profile.rows.length);
  return period < MIN_ESTIMATED_GRID || period > ceiling ? null : period;
}

/**
 * The spacings within a pixel of the median — their sum and count — and how many unbroken runs of
 * them each axis holds, a spacing outside the habit ending a run.
 */
function agreement(
  axes: readonly (readonly number[])[],
  median: number,
): { total: number; count: number; runs: number } {
  let total = 0;
  let count = 0;
  let runs = 0;
  for (const axis of axes) {
    let running = false;
    for (const spacing of axis) {
      const agrees = Math.abs(spacing - median) <= 1;
      if (agrees) {
        total += spacing;
        count += 1;
        if (!running) runs += 1;
      }
      running = agrees;
    }
  }
  return { total, count, runs };
}

/** The gaps between neighbouring lines on one axis. */
function axisSpacings(positions: readonly number[]): number[] {
  const spacings: number[] = [];
  for (let index = 1; index < positions.length; index += 1) {
    spacings.push((positions[index] ?? 0) - (positions[index - 1] ?? 0));
  }
  return spacings;
}
