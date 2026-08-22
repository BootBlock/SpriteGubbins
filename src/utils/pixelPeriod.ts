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
 * Finding the scale of art that was drawn at one and then **resampled about a lattice it kept**.
 *
 * The other half of the question `detectPixelGrid` answers in ./pixelGrid.ts. That one counts colour
 * transitions and asks which lattice they all fall on, which is exact and has no tolerance in it —
 * so a sheet whose edges have been softened by so much as a three-tap kernel puts transitions on
 * every column, no lattice can account for nine tenths of them, and the answer is `null` for
 * artwork that plainly has a scale. This reading is what covers that: art exported through a
 * smoothing resize, where the boundaries have become ramps but still start every `grid` pixels.
 *
 * **It is not what a generator returns, and this file said for a long time that it was.** Measured
 * across the eight sheets in `test_sprites/` — both axes, every candidate from 3 to 24 — the best
 * corrected share any of them reaches is 0.16 against a threshold of 0.9, and 0.35 with the phase
 * searched afresh in every 64-pixel window so that drift cannot decohere it. A returned sheet's
 * pitch *drifts*: its boundaries wander between, say, 6 and 7, so after a few dozen cells they are
 * no longer on any lattice at any phase, and every phase class of every candidate holds within one
 * per cent of chance. That is a fact about the artwork rather than about this threshold, so there is
 * no recalibration of it that would answer one of those sheets. `estimateProfilePeriod` is the
 * reading that serves them, because a correlation measures the repeat *distance* and never asks
 * where the repeats sit. `tests/sheet-scale-corpus.test.ts` holds the measurement.
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

  // Each axis's own total, computed once rather than per candidate: the qualification below reads
  // an axis's fit against the change that axis actually holds.
  const columnsTotal = axisTotal(profile.columns);
  const rowsTotal = profile.total - columnsTotal;

  for (let grid = measurableGridCeiling(image.width, image.height); grid >= MIN_ESTIMATED_GRID; grid -= 1) {
    if (fitsLattice(profile, columnsTotal, rowsTotal, grid)) return grid;
  }
  return null;
}

/** One axis's change, summed. Index 0 is unused and holds zero, so the whole array is safe to sum. */
function axisTotal(axis: Float64Array): number {
  let total = 0;
  for (const step of axis) total += step;
  return total;
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
function fitsLattice(
  profile: StepProfile,
  columnsTotal: number,
  rowsTotal: number,
  grid: PixelGrid,
): boolean {
  const down = bestLatticeFit(profile.columns, columnsTotal, grid);
  const across = bestLatticeFit(profile.rows, rowsTotal, grid);
  // **One axis is enough, and requiring both would be wrong**: a sheet of vertical stripes changes
  // down every column and across no row at all, and it has a scale.
  //
  // **But the qualifying axis has to be one the lattice explains**, not merely one that used the
  // spacing. The two conditions were separable, and an image was found in the gap: a tiny sheet
  // holding one real edge plus the ±1 noise floor every re-encode leaves. The noise put *some* mass
  // at every position, so on the axis with no structure at all every lattice line "carried", the
  // spacing qualified vacuously — and the share was then supplied almost entirely by the *other*
  // axis's single edge, which no period explains. Requiring the qualifying axis to clear the same
  // corrected threshold on its own change closes that: an axis of noise explains nothing, an axis
  // of stripes explains everything, and the pooled check below still holds the pair to it together.
  if (!qualifies(down, columnsTotal, grid) && !qualifies(across, rowsTotal, grid)) return false;

  return correctedShare(down.within + across.within, profile.total, grid) >= GRID_ESTIMATION_THRESHOLD;
}

/** Whether one axis both used this spacing and is explained by it — see the note in `fitsLattice`. */
function qualifies(fit: LatticeFit, total: number, grid: PixelGrid): boolean {
  return sawTheSpacing(fit) && correctedShare(fit.within, total, grid) >= GRID_ESTIMATION_THRESHOLD;
}

/**
 * The share of `total` sitting within the lattice's windows, less what a lattice this coarse would
 * collect from change spread evenly — the correction `fitsLattice`'s doc derives. Zero for an axis
 * with no change at all, which is an axis with nothing to explain rather than a perfect fit.
 */
function correctedShare(within: number, total: number, grid: PixelGrid): number {
  if (total === 0) return 0;
  const chance = (2 * SOFTENED_EDGE_RAMP + 1) / grid;
  return (within / total - chance) / (1 - chance);
}

/**
 * The best phase this scale has on one axis, measured by the change it accounts for.
 *
 * Ties keep the earlier phase, so the answer is deterministic; an axis with no change at all keeps
 * the empty fit, whose zero lines over zero available lines is what {@link sawTheSpacing} refuses.
 *
 * **A line "carries" only what beats chance**, and the floor is handed down from here because it is
 * a property of the axis rather than of any phase: a window collects `2 × ramp + 1` of the axis's
 * positions, so change spread with no structure at all hands every line that fraction of the
 * axis's total. A line at or below it has shown nothing — which is what lets the ±1-per-channel
 * noise floor a re-encode leaves be *ignored* rather than counted as the spacing being used. Before
 * the floor, that noise put token mass under every line of every candidate, `lines === available`
 * became vacuously true on the axis holding one real edge, and a 12-pixel sheet with no period in
 * it measured as its own ceiling.
 */
function bestLatticeFit(axis: Float64Array, total: number, grid: PixelGrid): LatticeFit {
  const usable = axis.length - 1;
  const carryFloor = usable > 0 ? ((2 * SOFTENED_EDGE_RAMP + 1) / usable) * total : 0;
  let best: LatticeFit = { within: 0, lines: 0, available: 0, adjacent: false };
  for (let phase = 0; phase < grid; phase += 1) {
    const fit = latticeFit(axis, grid, phase, carryFloor);
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
function latticeFit(axis: Float64Array, grid: PixelGrid, phase: number, carryFloor: number): LatticeFit {
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
    // Strictly above the floor, so an axis whose change is spread perfectly evenly — the definition
    // of structureless — has no line carrying anything. See `bestLatticeFit` for the floor itself.
    if (mass > carryFloor) {
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
