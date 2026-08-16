import type { GridOffset, PixelGrid } from '../types/quantiser.ts';
import { stepProfile } from './stepProfile.ts';

/**
 * Where a known pixel grid sits against this image.
 *
 * The other half of the question the two scale readers answer. They say how far apart the art's
 * boundaries repeat; this says how far in from the corner the repetition starts — and without it
 * the transform assumed the corner, so art inset by even a pixel had every cell resolved over a
 * window straddling two of its own, and the sheet came back as mush. The reported failure was a
 * generated sheet whose art sat nowhere near the canvas origin, quantised at the right scale to the
 * wrong lattice.
 *
 * **Measured for whatever grid is in force, however that grid was chosen.** A measured scale, a
 * clicked estimate and a hand-typed number all reach `quantiseImage` as the same setting, and this
 * runs there on the same image the alignment is about to walk — one mechanism, so no two paths can
 * disagree about where the lattice sits. It is deliberately *not* carried on `SheetScale` or any
 * setting: an offset stored beside a grid the user then overtypes would be the stale half of a pair.
 *
 * **Each axis is the argmax of the step profile over its phase classes.** A grid of `g` at offset
 * `p` claims the image changes on the lines `p, p + g, p + 2g, …` — so the offset the art actually
 * uses is the class holding the most change, measured in magnitude rather than counts so a softened
 * boundary still votes with the full step it was before the ramp spread it. On softened art the
 * heaviest single column can sit one pixel off the true boundary; the modal vote in `alignToGrid`
 * absorbs exactly that, since a cell misphased by one still holds a `(g − 1)²` majority of its own
 * art cell.
 *
 * Ties go to the smaller offset, so the answer is deterministic; an image with no structure at all
 * answers `{0, 0}` for the same reason. A grid of 1 has one phase class and answers `{0, 0}` without
 * the pass — there is nothing to measure and nowhere else the lattice could sit.
 */
export function bestGridOffset(image: ImageData, grid: PixelGrid): GridOffset {
  if (grid <= 1) return { x: 0, y: 0 };
  const profile = stepProfile(image);
  return { x: bestPhase(profile.columns, grid), y: bestPhase(profile.rows, grid) };
}

/**
 * The phase class holding the most change on one axis.
 *
 * Position 0 is skipped in every class: the first pixel has nothing before it to differ from, so
 * index 0 of the profile is unused and a lattice line at the image's own edge is not evidence.
 */
function bestPhase(axis: Float64Array, grid: PixelGrid): number {
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
