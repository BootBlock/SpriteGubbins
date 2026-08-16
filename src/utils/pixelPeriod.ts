import {
  GRID_ESTIMATION_THRESHOLD,
  measurableGridCeiling,
  MIN_ESTIMATED_GRID,
  SOFTENED_EDGE_RAMP,
} from '../constants/quantiser.ts';
import type { PixelGrid } from '../types/quantiser.ts';
import type { StepProfile } from './stepProfile.ts';
import { stepProfile } from './stepProfile.ts';

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
 * **Each axis takes the best of its scale's phase classes**, exactly as the exact detector does: a
 * generator puts its art wherever composition does, so art drawn at 8 and inset three pixels from
 * the corner ramps around the lines `3, 11, 19, …` — the same period at a different phase, not a
 * different period. This measurement was origin-anchored for a long time, deliberately, because the
 * transform it fed could only snap from the corner: a scale measured at a phase the alignment could
 * not apply would have resolved every cell over a window straddling two of the art's own, so inset
 * art was refused, or answered with whatever *divisor* of its true scale happened to sit near the
 * corner-anchored lattice, and the panel told the user to crop the margin off. `bestGridOffset`
 * removed the constraint at its root — the alignment now measures where the lattice sits for
 * whatever grid is in force — so the reading is free to answer the true scale wherever the art
 * sits, and the crop-the-margin instruction is gone with it.
 */

/** What one axis makes of a candidate scale at one phase: how much change sits on it, and how. */
interface LatticeFit {
  /** Step magnitude within {@link SOFTENED_EDGE_RAMP} of one of this phase's interior lattice lines. */
  readonly within: number;
  /** How many of those lines carry any of it. */
  readonly lines: number;
  /** How many lines this scale offered at this phase, which is what {@link lines} is read against. */
  readonly available: number;
  /** Whether two **neighbouring** lines both carry change — the spacing itself, observed directly. */
  readonly adjacent: boolean;
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

  for (let grid = measurableGridCeiling(image.width, image.height); grid >= MIN_ESTIMATED_GRID; grid -= 1) {
    if (fitsLattice(profile, grid)) return grid;
  }
  return null;
}

/**
 * Whether this scale accounts for the sheet, on **both** of the counts a period has to satisfy.
 *
 * A share of change and an observation of the spacing, and neither alone is a measurement. The
 * share says the change *fits* this lattice; {@link sawTheSpacing} says the lattice was *used*,
 * which is the difference between a period and a coincidence.
 *
 * **The share is corrected for what a lattice of this scale would collect from an image with no
 * structure at all**, and that correction is what makes one threshold mean the same thing at every
 * scale. A window of `2 × ramp + 1` positions is three thirty-seconds of a grid of 32 and three
 * quarters of a grid of 4, so an uncorrected share would climb towards 1 as the candidate narrowed
 * and every smooth image in the world would measure as a grid of 4. Subtracting that expectation and
 * rescaling leaves a figure that is 0 for an unstructured image whatever the candidate, and — the
 * identity worth knowing — the fraction of the sheet's change that belongs to the lattice rather
 * than to the noise around it, the same quantity the exact detector's share reports for a crisp
 * sheet. That identity is exact where the scale divides the axis and slightly **pessimistic** where
 * it does not, because the last partial cell offers fewer positions than the expectation assumes it
 * does. A perfect fit still scores exactly 1 either way, so the direction of the error only ever
 * costs a marginal reading, never invents one.
 *
 * A scale twice the truth *collects* about half the sheet's change at its best phase — half the
 * art's boundaries land between the doubled lattice's lines wherever it sits — but that raw half is
 * not what is compared with the threshold. After the correction it scores 0.17 to 0.38 across these
 * fixtures, and one three times the truth at most 0.24. Both are a long way under any threshold
 * worth having, and the gap is wider than the raw shares suggest.
 */
function fitsLattice(profile: StepProfile, grid: PixelGrid): boolean {
  const down = bestLatticeFit(profile.columns, grid);
  const across = bestLatticeFit(profile.rows, grid);
  // **One axis is enough, and requiring both would be wrong**: a sheet of vertical stripes changes
  // down every column and across no row at all, and it has a scale.
  if (!sawTheSpacing(down) && !sawTheSpacing(across)) return false;

  const chance = (2 * SOFTENED_EDGE_RAMP + 1) / grid;
  const share = ((down.within + across.within) / profile.total - chance) / (1 - chance);
  return share >= GRID_ESTIMATION_THRESHOLD;
}

/**
 * The best phase this scale has on one axis, measured by the change it accounts for.
 *
 * Ties keep the earlier phase, so the answer is deterministic; an axis with no change at all keeps
 * the empty fit, whose zero lines over zero available lines is what {@link sawTheSpacing} refuses.
 */
function bestLatticeFit(axis: Float64Array, grid: PixelGrid): LatticeFit {
  let best: LatticeFit = { within: 0, lines: 0, available: 0, adjacent: false };
  for (let phase = 0; phase < grid; phase += 1) {
    const fit = latticeFit(axis, grid, phase);
    if (fit.within > best.within) best = fit;
  }
  return best;
}

/**
 * How much of one axis's change lies on this scale's lattice at one phase, and how the lines that
 * carry it sit relative to one another.
 *
 * Walks the **lines** rather than the positions, which is what makes "a line the art could actually
 * have drawn" the thing being counted. Two kinds of line are excluded by construction rather than by
 * a test, and both mattered:
 *
 * - **The line at position zero**, because there is no transition at the image's own edge — the
 *   first pixel has nothing before it to differ from. Admitting it hands every candidate a free
 *   position that no lattice put anything in. On a sheet with art in it that is one column in
 *   hundreds; on a nearly flat one it is the *whole* of the evidence.
 * - **Any line past the last position**, whose ramp would otherwise reach back inside the image
 *   and collect the change at its far edge on behalf of a line that is not in the picture.
 *
 * Windows cannot overlap and so cannot double-count: they are `2 × ramp + 1` wide and the lines are
 * `grid` apart, and {@link MIN_ESTIMATED_GRID} is the first scale where the second exceeds the first.
 */
function latticeFit(axis: Float64Array, grid: PixelGrid, phase: number): LatticeFit {
  let within = 0;
  let lines = 0;
  let available = 0;
  let adjacent = false;
  let previousCarried = false;

  for (let line = phase === 0 ? grid : phase; line <= axis.length - 1; line += grid) {
    available += 1;
    let mass = 0;
    for (let position = line - SOFTENED_EDGE_RAMP; position <= line + SOFTENED_EDGE_RAMP; position += 1) {
      if (position >= 1 && position < axis.length) mass += axis[position] ?? 0;
    }
    within += mass;
    if (mass > 0) {
      lines += 1;
      if (previousCarried) adjacent = true;
      previousCarried = true;
    } else {
      previousCarried = false;
    }
  }

  return { within, lines, available, adjacent };
}

/**
 * Whether one axis saw enough of this scale to call it a period rather than a coincidence.
 *
 * Two ways to qualify, and the second is not a let-off. Either two **neighbouring** lattice lines
 * both carry change — the spacing itself, observed directly as the gap between them — or the scale
 * had every one of its lines used, which is how the smallest sheet capable of holding a period at
 * all qualifies: art two cells to a side has exactly one interior boundary, and there is no reading
 * of it that asks for more.
 *
 * **What it refuses is change that fits the lattice without ever using its spacing.** A single
 * feature anywhere in an otherwise flat sheet puts all its change through one line of some
 * candidate whatever position it sits at — one line is no period. Two isolated features have some
 * candidate whose lines pass through both, but unless they sit exactly one spacing apart the lines
 * that hit them are not neighbours, and the empty lines between them are the tell: a one-pixel
 * frame around a 256-pixel sheet fits a lattice of 127 at phase 1 perfectly, and the line in the
 * middle of that lattice passes through nothing. Requiring **adjacency** rather than a bare count
 * of used lines is what closes that shape — a count of two was satisfied by exactly that frame the
 * moment the measurement learnt to consider phases.
 *
 * Two shapes remain measurable that arguably should not be, and they are one shape: a feature at
 * the exact midpoint of the sheet, and two marks spaced exactly one candidate apart. Both qualify
 * through the every-line-used clause, and no period measurement can separate them from honest
 * two-cell art, because there is nothing to separate — the evidence really is periodic. That is one
 * of the reasons an estimate is offered rather than adopted.
 */
function sawTheSpacing({ lines, available, adjacent }: LatticeFit): boolean {
  return adjacent || (available > 0 && lines === available);
}
