import type { PixelGrid } from '../types/quantiser.ts';

/**
 * How short of the axis's total change the resultant may fall before the phases are called
 * indistinguishable — a floating-point allowance, not a calibration. Change spread evenly over every
 * phase cancels to zero exactly in arithmetic and to rounding error in practice, and the angle of
 * rounding error is not a placement.
 */
const CANCELLED_SHARE = 1e-9;

/**
 * The circular mean of one axis's change around a lattice of `grid` — where a regular lattice of
 * `grid` best sits, when all there is to go on is the profile.
 *
 * The fallback half of placing a grid on an image. `boundaryMesh` cuts a sheet exactly drawn on a
 * lattice of the grid on that lattice, and places the cells of any other sheet on the boundaries it
 * detects, which is the answer wherever the image holds enough of them to anchor a mesh; an axis
 * with fewer than two detectable boundaries — a flat field, a gradient, heavy noise, dense detail
 * that never stands clear of its own background — offers no spacing to walk, and the best single
 * answer left is the phase the axis's change is centred on. The change is measured in the evidence
 * the axis's lines are read from, which is magnitude on a resampled axis, where a softened boundary
 * still votes with the full step it was before the ramp spread it, and transitions on a crisp one,
 * where a stray pixel's loud step does not outvote the boundaries.
 *
 * **The centre, not the heaviest phase class**, because softening spreads a boundary symmetrically.
 * A three-tap blur puts a boundary's change on the pixel before it, the pixel itself and the pixel
 * after in equal thirds, so the three classes tie and a class-by-class maximum answers whichever the
 * tie-break or the noise favours — one pixel off. Each position is a point on a circle of `grid`
 * around which the lattice repeats, weighted by its change; the angle of their sum is the phase the
 * change is centred on, which is the boundary itself for any symmetric spread, and the class itself
 * where the change is crisp. Random art at pitches of 4 and 5 behind that blur finds no lines at
 * any phase, and the heaviest class put the fallback lattice a pixel early at every phase from 2
 * up (#483).
 *
 * Takes the profile's axis rather than the image, because every caller has already paid for the
 * profile: recomputing it here would be a second full-image pass buying nothing.
 *
 * An axis with no change, or change that cancels around the circle, answers 0, so the answer is
 * deterministic where no phase is better than another. Position 0 is skipped: the first pixel has
 * nothing before it to differ from, so index 0 of the profile is unused and a lattice line at the
 * image's own edge is not evidence.
 */
export function bestPhase(axis: Float64Array, grid: PixelGrid): number {
  let total = 0;
  let cosine = 0;
  let sine = 0;
  for (let position = 1; position < axis.length; position += 1) {
    const change = axis[position] ?? 0;
    const angle = (2 * Math.PI * (position % grid)) / grid;
    total += change;
    cosine += change * Math.cos(angle);
    sine += change * Math.sin(angle);
  }
  if (Math.hypot(cosine, sine) <= total * CANCELLED_SHARE) return 0;
  const phase = Math.round((Math.atan2(sine, cosine) * grid) / (2 * Math.PI));
  return ((phase % grid) + grid) % grid;
}
