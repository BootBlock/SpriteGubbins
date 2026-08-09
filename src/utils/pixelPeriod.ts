import {
  GRID_ESTIMATION_THRESHOLD,
  MAX_DETECTED_GRID,
  MIN_ESTIMATED_GRID,
  MIN_LATTICE_LINES,
  SOFTENED_EDGE_RAMP,
} from '../constants/quantiser.ts';
import type { PixelGrid } from '../types/quantiser.ts';
import { CHANNELS_PER_PIXEL } from './imageData.ts';

/**
 * Finding the scale of art that was drawn at one and then **resampled**.
 *
 * The other half of the question `detectPixelGrid` answers in ./pixelGrid.ts, and the half that
 * covers what models actually return. That one counts colour transitions and asks which lattice
 * they all fall on, which is exact and has no tolerance in it — so a sheet whose edges have been
 * softened by so much as a three-tap kernel puts transitions on every column, no lattice can
 * account for nine tenths of them, and the answer is `null` for the most common input this tab has.
 *
 * What survives resampling is not *where* an image changes but **how often**. A boundary becomes a
 * ramp, and a ramp still starts every `grid` pixels, so the measurement here is of a period rather
 * than of a membership: how much of the sheet's total change sits within
 * {@link SOFTENED_EDGE_RAMP} of a lattice line, against how much a lattice that scale would collect
 * from an image with no structure in it at all.
 *
 * **Anchored at the image's own origin, which is not a detail.** `alignToGrid` snaps from the
 * top-left corner, so a scale measured against any other phase is one the transform cannot apply —
 * it would resolve each cell over a window straddling two of the art's own, and reduce the sheet to
 * mush. A comb over `position % grid` that took its *modal* remainder would measure inset art
 * happily and confidently, which is the trap this is written to avoid: the window below is fixed on
 * remainder zero, so art that starts two or three pixels in scores 0.25 at best and answers `null`,
 * and the tab tells the user to crop the margin off.
 *
 * **The anchor carries one pixel of slack, and it has to.** The window is
 * {@link SOFTENED_EDGE_RAMP} wide by construction, so art inset by a single pixel is not
 * *distinguished* from art whose boundaries have softened outwards by one — the two are the same
 * signal, and no amount of care separates them. It is therefore not refused on principle, and
 * whether it clears the threshold depends on how many boundaries the sheet has: the one nearest the
 * origin is never reached, because there is no lattice line at zero, so it costs a sixteenth of the
 * evidence on a sheet with sixteen boundaries and an eighth on one with eight. Measured on 128-pixel
 * fixtures, a one-pixel inset scores 0.900 at a grid of 8 and 0.846 at 16 — either side of the line.
 *
 * **Both outcomes are safe, which is why the fuzziness is tolerable.** Refused, the tab tells the
 * user to crop, and cropping is never wrong. Measured, `alignToGrid` absorbs the same pixel: at a
 * one-pixel offset each cell still holds `(grid - 1)²` of one art cell against `grid²` in total,
 * which is a majority at every scale this considers, so the modal vote returns the right colour.
 * **Two pixels is where that majority argument starts to weaken and where the measurement stops
 * answering** — 0.25 at best, well under the threshold.
 *
 * A deeper inset is not automatically refused either, and should not be: art at a grid of 8 that
 * starts four pixels in has every boundary on a multiple of **4**, so the grid-4 lattice is both
 * origin-anchored and lossless — every one of its cells falls wholly inside one of the art's — and 4
 * is what comes back. That is the coarsest scale that can actually be applied to the sheet, which is
 * the whole of what this is asked for. Under-reducing by a factor of two is a smaller wrong than
 * refusing to reduce at all.
 */

/**
 * How much the image changes at each column and row, as summed magnitude rather than a count.
 *
 * The counterpart of `edgeLattice` next door, and different in the one way that matters: that asks
 * *whether* two neighbouring pixels differ, which a ramp answers "yes" to three times over, while
 * this asks *by how much*, which the same ramp divides between three positions without inventing
 * any. So the whole of a softened boundary still totals the step it was before it was softened, and
 * the lattice it belongs to can be scored on magnitude the way a crisp one is scored on counts.
 *
 * Magnitude is the L1 distance across all four channels. Alpha is one of them for the reason it is
 * part of the exact comparison too: a silhouette edge against transparency is a change like any
 * other, and on a keyed sheet it is often the only one left.
 *
 * `Float64Array` rather than the `Uint32Array` a *count* fits in, and the reason is the **shape** a
 * sheet is allowed to be rather than its size. `MAX_IMAGE_PIXELS` bounds an image's area, not either
 * of its sides — `useImageFile` admits anything with `width × height` inside it — so a 2 × 8,388,608
 * sheet is a legal input, and its one interior column sums 8.4 million steps of up to 1020 apiece:
 * about 8.6 × 10⁹, where a `Uint32Array` element stops at 4.29 × 10⁹. A square sheet never comes
 * close, which is exactly why the bound has to be read off the cap that exists rather than the
 * proportions one imagines.
 */
interface StepProfile {
  /** `columns[x]` — how much pixel `x` differs from pixel `x - 1`, down the whole column. Index 0 is unused. */
  readonly columns: Float64Array;
  /** `rows[y]` — how much row `y` differs from row `y - 1`, across the whole row. Index 0 is unused. */
  readonly rows: Float64Array;
  /** Every step in the image, both directions together. */
  readonly total: number;
}

/** What one axis makes of a candidate scale: how much change sits on it, and over how many lines. */
interface LatticeFit {
  /** Step magnitude within {@link SOFTENED_EDGE_RAMP} of one of this scale's interior lattice lines. */
  readonly within: number;
  /** How many of those lines carry any of it — the evidence that the spacing is a period at all. */
  readonly lines: number;
}

/**
 * The pixel scale a resampled sheet's art was drawn at, or `null` when none can be measured.
 *
 * A **candidate, never an adoption** — which is the difference between this and `detectPixelGrid`,
 * and the reason `measureSheetScale` keeps a note of which of the two produced a number. This one
 * carries a tolerance: it is reading a period through the softening that destroyed the edges, so it
 * is offered for the user to click and check against the preview, and it never becomes the grid in
 * force on its own.
 *
 * Largest candidate first, for the same reason as the exact detector: art drawn at 8 also sits
 * perfectly on the lattices of 4, 2 and 1, and the coarsest that holds is the real one. It stops at
 * {@link MIN_ESTIMATED_GRID} rather than at 2, because a ramp three pixels wide leaves nothing to
 * measure in a cell that narrow — see the constant.
 *
 * `null` for an image with no steps at all, for the same reason the exact detector answers `null` to
 * one flat colour: there is no scale in it, and every candidate would fit it equally.
 */
export function estimatePixelGrid(image: ImageData): PixelGrid | null {
  const profile = stepProfile(image);
  if (profile.total === 0) return null;

  for (let grid = MAX_DETECTED_GRID; grid >= MIN_ESTIMATED_GRID; grid -= 1) {
    if (fitsLattice(profile, grid)) return grid;
  }
  return null;
}

/**
 * One pass over the image, totalling the step to each pixel's left and upper neighbour by the column
 * and row it falls on.
 *
 * Reads the four channels directly rather than through `packedColorAt`, which the exact detector
 * uses: that packs a colour so two of them can be compared for equality in one integer, and this
 * needs the channels apart to subtract them.
 */
function stepProfile(image: ImageData): StepProfile {
  const { width, height, data } = image;
  const columns = new Float64Array(width);
  const rows = new Float64Array(height);
  let total = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * CHANNELS_PER_PIXEL;

      if (x > 0) {
        const step = channelDistance(data, offset, offset - CHANNELS_PER_PIXEL);
        columns[x] = (columns[x] ?? 0) + step;
        total += step;
      }
      if (y > 0) {
        const step = channelDistance(data, offset, offset - width * CHANNELS_PER_PIXEL);
        rows[y] = (rows[y] ?? 0) + step;
        total += step;
      }
    }
  }

  return { columns, rows, total };
}

/** How far apart two pixels are, summed across the four channels. */
function channelDistance(data: Uint8ClampedArray, offset: number, other: number): number {
  let distance = 0;
  for (let channel = 0; channel < CHANNELS_PER_PIXEL; channel += 1) {
    distance += Math.abs((data[offset + channel] ?? 0) - (data[other + channel] ?? 0));
  }
  return distance;
}

/**
 * Whether this scale accounts for the sheet, on **both** of the counts a period has to satisfy.
 *
 * A share of change and a count of lines, and neither alone is a measurement. The share says the
 * change *fits* this lattice; the count says the lattice was *used more than once*, which is the
 * difference between a period and a coincidence — see {@link MIN_LATTICE_LINES} for the sheets that
 * scored a perfect 1 on the share alone.
 *
 * **The share is corrected for what a lattice of this scale would collect from an image with no
 * structure at all**, and that correction is what makes one threshold mean the same thing at every
 * scale. A window of `2 × ramp + 1` positions is three thirty-seconds of a grid of 32 and three
 * quarters of a grid of 4, so an uncorrected share would climb towards 1 as the candidate narrowed
 * and every smooth image in the world would measure as a grid of 4. Subtracting that expectation and
 * rescaling leaves a figure that is 0 for an unstructured image whatever the candidate, and — the
 * identity worth knowing — exactly the fraction of the sheet's change that belongs to the lattice
 * rather than to the noise around it, the same quantity `alignedShare` reports for a crisp sheet.
 *
 * It falls out of that identity that a scale twice the truth scores about a half and one three times
 * it about a third, whatever the ramp: half the art's boundaries land between the doubled scale's
 * lattice lines, and no threshold worth having is that low.
 */
function fitsLattice({ columns, rows, total }: StepProfile, grid: PixelGrid): boolean {
  const down = latticeFit(columns, grid);
  const across = latticeFit(rows, grid);
  if (down.lines + across.lines < MIN_LATTICE_LINES) return false;

  const chance = (2 * SOFTENED_EDGE_RAMP + 1) / grid;
  const share = ((down.within + across.within) / total - chance) / (1 - chance);
  return share >= GRID_ESTIMATION_THRESHOLD;
}

/**
 * How much of one axis's change lies on this scale's lattice, and across how many of its lines.
 *
 * Walks the **lines** rather than the positions, which is what makes "a line the art could actually
 * have drawn" the thing being counted. Two kinds of line are excluded by construction rather than by
 * a test, and both mattered:
 *
 * - **The multiple at zero**, because there is no transition at the image's own edge — the first
 *   pixel has nothing before it to differ from. Admitting it hands every candidate a free position
 *   that no lattice put anything in. On a sheet with art in it that is one column in hundreds; on a
 *   nearly flat one it is the *whole* of the evidence.
 * - **Any multiple past the last position**, whose ramp would otherwise reach back inside the image
 *   and collect the change at its far edge on behalf of a line that is not in the picture.
 *
 * Windows cannot overlap and so cannot double-count: they are `2 × ramp + 1` wide and the lines are
 * `grid` apart, and {@link MIN_ESTIMATED_GRID} is the first scale where the second exceeds the first.
 */
function latticeFit(axis: Float64Array, grid: PixelGrid): LatticeFit {
  let within = 0;
  let lines = 0;

  for (let line = grid; line <= axis.length - 1; line += grid) {
    let mass = 0;
    for (let position = line - SOFTENED_EDGE_RAMP; position <= line + SOFTENED_EDGE_RAMP; position += 1) {
      if (position >= 1 && position < axis.length) mass += axis[position] ?? 0;
    }
    within += mass;
    if (mass > 0) lines += 1;
  }

  return { within, lines };
}
