import type { PixelGrid } from '../types/quantiser.ts';

/**
 * The phase class holding the most change on one axis — where a regular lattice of `grid` best
 * sits, when all there is to go on is the profile.
 *
 * The fallback half of placing a grid on an image. `boundaryMesh` places cells on the boundaries it
 * detects, which is the answer wherever the image holds enough of them to anchor a mesh; an axis
 * with fewer than two detectable boundaries — a flat field, a gradient, heavy noise — offers no
 * spacing to walk, and the best single answer left is the phase whose lattice collects the most of
 * whatever change there is. A grid of `g` at phase `p` claims the image changes on the lines
 * `p, p + g, p + 2g, …`, so the phase the art actually uses is the class holding the most change —
 * measured in magnitude rather than counts, so a softened boundary still votes with the full step
 * it was before the ramp spread it.
 *
 * Takes the profile's axis rather than the image, because every caller has already paid for the
 * profile: recomputing it here would be a second full-image pass buying nothing, which is exactly
 * what the function this replaced did.
 *
 * Ties go to the smaller phase, so the answer is deterministic; an axis with no change at all
 * answers 0 for the same reason. Position 0 is skipped in every class: the first pixel has nothing
 * before it to differ from, so index 0 of the profile is unused and a lattice line at the image's
 * own edge is not evidence.
 */
export function bestPhase(axis: Float64Array, grid: PixelGrid): number {
  let best = 0;
  let bestMass = 0;
  for (let phase = 0; phase < grid; phase += 1) {
    let mass = 0;
    for (let position = phase === 0 ? grid : phase; position < axis.length; position += grid) {
      mass += axis[position] ?? 0;
    }
    if (mass > bestMass) {
      bestMass = mass;
      best = phase;
    }
  }
  return best;
}
