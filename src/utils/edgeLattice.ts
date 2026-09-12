import { GRID_DETECTION_THRESHOLD } from '../constants/quantiser.ts';
import type { GridOffset, PixelGrid } from '../types/quantiser.ts';
import { meshCanCutAt } from './boundEndCells.ts';
import { CHANNELS_PER_PIXEL, packedColorAt } from './imageData.ts';

/**
 * Whether a sheet is exactly a grid of some scale, and where that grid's lattice sits.
 *
 * **One statement read by two passes, which is why it is not filed inside either.**
 * `detectPixelGrid` asks it of every candidate scale to find the one a sheet was drawn at, and
 * `boundaryMesh` asks it of the grid in force to decide whether there is anything to walk. For a
 * while only the detector asked, and the mesh walked every sheet — so an exact reading was a claim
 * about a lattice the reduction then did not use, and on crisp art whose stray pixels outweighed its
 * cell boundaries the walk cut beside every one of them. Two spellings of the question would be two
 * answers to it, free to disagree about the same sheet in exactly that way.
 */

/**
 * Where one pixel differs from the neighbour above it or to its left, totalled by position.
 *
 * The whole of what the exact question needs to know about an image, and the reason it needs only one
 * pass to learn it: a grid of `g` is exactly the claim that **no colour changes anywhere except on one
 * of `g`'s phase classes** — the lines `p, p + g, p + 2g, …` for some offset `p` — so once the
 * transitions are counted by the row and column they fall on, every candidate scale is scored by
 * summing the entries on each of its classes rather than by walking the image again.
 */
export interface EdgeLattice {
  /** `columnEdges[x]` — rows in which pixel `x` differs from pixel `x - 1`. Index 0 is unused. */
  readonly columnEdges: Uint32Array;
  /** `rowEdges[y]` — columns in which row `y` differs from row `y - 1`. Index 0 is unused. */
  readonly rowEdges: Uint32Array;
  /** Every transition in the image, both directions together. */
  readonly total: number;
}

/**
 * One pass over the image, counting every colour transition by the row or column it falls on.
 *
 * Each pixel is packed once and compared with the two neighbours that have already been packed — the
 * one to its left, carried in a variable, and the one above it, carried in a row of the previous
 * scanline's values. So the cost is one pack and two integer comparisons per pixel, whatever the
 * image, rather than the up-to-31 full passes counting uniform blocks took.
 *
 * Alpha is part of the comparison, because a silhouette edge against transparency is a transition
 * like any other and is often the only one a keyed sheet has left.
 */
export function edgeLattice(image: ImageData): EdgeLattice {
  const { width, height, data } = image;
  const columnEdges = new Uint32Array(width);
  const rowEdges = new Uint32Array(height);
  const above = new Uint32Array(width);
  let total = 0;

  for (let y = 0; y < height; y += 1) {
    let left = 0;
    for (let x = 0; x < width; x += 1) {
      const packed = packedColorAt(data, (y * width + x) * CHANNELS_PER_PIXEL);

      if (x > 0 && packed !== left) {
        columnEdges[x] = (columnEdges[x] ?? 0) + 1;
        total += 1;
      }
      if (y > 0 && packed !== above[x]) {
        rowEdges[y] = (rowEdges[y] ?? 0) + 1;
        total += 1;
      }

      left = packed;
      above[x] = packed;
    }
  }

  return { columnEdges, rowEdges, total };
}

/**
 * Where the lattice of `grid` this image is exactly drawn on sits, or `null` where it is not a grid of
 * `grid` at all.
 *
 * The image is a grid of `grid` when the best phase class on each axis, summed, holds at least
 * `GRID_DETECTION_THRESHOLD` of every transition in the image — and the answer is those two phases,
 * which is a {@link GridOffset} by definition: how far in the first interior cut of that lattice falls
 * on each axis. `detectPixelGrid` argues the scoring — why transitions rather than uniform blocks, why
 * a line inside a folded end band counts against a scale and never for it — and `boundaryMesh` is why
 * the phases are returned rather than a yes or a no.
 *
 * An image with no transitions answers `null`: every lattice fits it equally, so none of them is one
 * it is drawn on.
 */
export function exactGridOffset(lattice: EdgeLattice, grid: PixelGrid): GridOffset | null {
  if (lattice.total === 0) return null;
  const x = bestPhaseClass(lattice.columnEdges, grid);
  const y = bestPhaseClass(lattice.rowEdges, grid);
  return (x.count + y.count) / lattice.total >= GRID_DETECTION_THRESHOLD ? { x: x.phase, y: y.phase } : null;
}

/** One axis's best phase class, and how many transitions it holds. */
interface PhaseCount {
  readonly phase: number;
  readonly count: number;
}

/**
 * The phase class of this scale holding the most transitions on one axis, and how many it holds.
 *
 * Read against the image's total, the summed best of the two axes degrades in proportion to how
 * much of the detail the scale would destroy: a grid twice as coarse as the truth misses every
 * other line of the art's own lattice whatever phase it takes, and scores about a half — which is
 * why the threshold has room to allow a stray pixel without ever allowing a doubled scale.
 *
 * Position 0 is skipped in every class: the first pixel has nothing before it to differ from, so
 * index 0 is unused and a lattice line at the image's own edge is not evidence. A line inside an end
 * band the mesh folds is skipped too — it is change no reduction at this scale keeps — but it stays in
 * the image's total, so it counts against the scale rather than for it; see `detectPixelGrid`.
 *
 * Counts where `bestPhase` in `bestPhase.ts` weighs a resampled axis by magnitude, because this is the
 * exact question and that is the soft-edged one: a softened ramp is three transitions and one step. Ties go to the
 * smaller phase, so the answer is deterministic; an axis with no transitions on any line a mesh can
 * cut answers 0 for the same reason.
 */
function bestPhaseClass(edges: Uint32Array, grid: PixelGrid): PhaseCount {
  let best: PhaseCount = { phase: 0, count: 0 };
  for (let phase = 0; phase < grid; phase += 1) {
    let count = 0;
    for (let position = phase === 0 ? grid : phase; position < edges.length; position += grid) {
      if (meshCanCutAt(position, edges.length, grid)) count += edges[position] ?? 0;
    }
    if (count > best.count) best = { phase, count };
  }
  return best;
}
