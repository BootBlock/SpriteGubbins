import { GRID_DETECTION_THRESHOLD, MAX_DETECTED_GRID } from '../constants/quantiser.ts';
import type { PixelGrid } from '../types/quantiser.ts';
import { CHANNELS_PER_PIXEL, packedColorAt } from './imageData.ts';

/**
 * Finding the scale a returned sheet's art was actually drawn at.
 *
 * A question about an image, not a transform of one — snapping to the answer and reducing to it are
 * `alignToGrid` and `downscaleNearest` in ./gridAlignment.ts, and `quantiseImage` is what runs the
 * three in order.
 */

/**
 * Where one pixel differs from the neighbour above it or to its left, totalled by position.
 *
 * The whole of what detection needs to know about an image, and the reason it needs only one pass to
 * learn it: a grid of `g` is exactly the claim that **no colour changes anywhere except on the
 * `g`-lattice**, so once the transitions are counted by the row and column they fall on, every
 * candidate scale is scored by adding up thirty-odd numbers rather than by walking the image again.
 */
interface EdgeLattice {
  /** `columnEdges[x]` — rows in which pixel `x` differs from pixel `x - 1`. Index 0 is unused. */
  readonly columnEdges: Uint32Array;
  /** `rowEdges[y]` — columns in which row `y` differs from row `y - 1`. Index 0 is unused. */
  readonly rowEdges: Uint32Array;
  /** Every transition in the image, both directions together. */
  readonly total: number;
}

/**
 * The pixel scale the image was drawn at, or `null` when it has none.
 *
 * **Scored on where the image changes, not on how much of it is flat.** The two sound equivalent and
 * are not: a sheet is a grid of `g` precisely when every colour transition in it lands on a multiple
 * of `g`, and asking the question that way weights the evidence by how much detail is at stake rather
 * than by how much canvas is. Counting *uniform blocks* instead — the obvious reading, and what this
 * did first — lets empty space vote. A 2048 × 2048 sheet holding a few small sprites drawn at 4 on a
 * flat key field is over 99% background, so at a candidate of 32 more than 90% of its blocks are
 * uniform and detection confidently answered 32: a scale that would reduce the art to a smear.
 * Measured on exactly that image, the block count returns 32 and this returns 4.
 *
 * Largest candidate first, because a true grid of 8 also scores perfectly at 4, 2 and 1 — the
 * coarsest grid that holds is the real one. Candidates stop at 2 because every image is trivially
 * uniform at 1, so a detector that considered it could never answer `null`.
 *
 * `null` is the honest answer for genuinely smooth artwork, and a useful one: it says the model
 * returned a painted image rather than pixel art at a scale, and the tab then asks for a grid instead
 * of guessing. An image with **no** transitions at all — one flat colour, edge to edge — answers
 * `null` too: there is no scale in it to measure, and every candidate would fit equally.
 *
 * **The lattice is assumed to start at the image's own origin.** A sheet whose art is offset by a few
 * pixels from the top-left corner has a scale this cannot see, and the manual grid box will not fix
 * it either, because the transform snaps from the origin as well. Cropping the margin off is the
 * answer, and detection saying `null` is what tells the user to go and look.
 */
export function detectPixelGrid(image: ImageData): PixelGrid | null {
  const lattice = edgeLattice(image);
  if (lattice.total === 0) return null;

  for (let grid = MAX_DETECTED_GRID; grid >= 2; grid -= 1) {
    if (alignedShare(lattice, grid) >= GRID_DETECTION_THRESHOLD) return grid;
  }
  return null;
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
function edgeLattice(image: ImageData): EdgeLattice {
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
 * The fraction of the image's transitions that fall on this scale's lattice.
 *
 * `1` says the image changes nowhere but on the lattice, which is the same statement as every whole
 * block being one colour. Below that it degrades in proportion to how much of the detail the scale
 * would destroy — a grid twice as coarse as the truth misses every other lattice line and scores
 * about a half, which is why the threshold has room to allow a stray pixel without ever allowing a
 * doubled scale.
 */
function alignedShare({ columnEdges, rowEdges, total }: EdgeLattice, grid: PixelGrid): number {
  let aligned = 0;
  for (let x = grid; x < columnEdges.length; x += grid) aligned += columnEdges[x] ?? 0;
  for (let y = grid; y < rowEdges.length; y += grid) aligned += rowEdges[y] ?? 0;
  return aligned / total;
}
