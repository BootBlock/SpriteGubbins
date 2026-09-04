import {
  ACF_CORRELATION_FLOOR,
  ACF_FEWEST_REPEATS,
  ACF_HARMONIC_DESCENT,
  ACF_MULTIPLE_CONFIRMATION,
  ACF_STRUCTURE_FLOOR,
  measurableGridCeiling,
  MIN_CORRELATED_PERIOD,
} from '../constants/quantiser.ts';
import type { PixelGrid } from '../types/quantiser.ts';
import {
  axisMoments,
  bestSupportedPeak,
  correlogram,
  divisionsOf,
  windowedMass,
} from './correlationPeaks.ts';
import type { StepProfile } from './stepProfile.ts';

/**
 * The scale of a sheet read from the *whole* step profile, by autocorrelation — one axis at a time.
 *
 * The reading that serves real generated sheets, whose interior detail is hardest on every line-list
 * approach: straps, crosses and rivets put strong edges between the cell boundaries, and a line list
 * can only separate those from the boundaries while the two populations are still separable at all.
 * `boundaryClusters` measures against the axis's background rather than its mean for exactly that
 * reason, and it holds the lattice on the sheets this file's fixtures carry — but detail dense
 * enough to sit in every second cell overlaps the boundaries whatever the floor is. Correlating a
 * profile against a shifted copy of itself needs no separation at all: it uses all of the mass,
 * unthresholded, and the periodic component the pixel grid contributes still peaks at multiples of
 * the pitch however much broadband detail rides on top of it.
 *
 * **Each axis is read alone, and the two answers are reconciled afterwards.** Summing the axes'
 * covariances first read as one number, and that was its defect: detail patterned along one axis
 * can *anticorrelate* at the true pitch, and in the summed form that anticorrelation cancelled the
 * other axis's clean fundamental — the reading then offered the pitch's double, which merges the
 * art's cells for good. Read apart, the polluted axis disagrees or finds nothing at all.
 *
 * **The reconciliation turns on whether an axis can vouch for itself**, which `AxisReading.sure`
 * carries. Two axes that agree within a pixel offer the finer, provided one of them is sure — two
 * unsure axes corroborate nothing, because a *content* periodicity lands on both axes as readily as
 * a pixel pitch does. Apart, the sure axis speaks alone: an axis reading weak evidence gets no veto
 * over one reading strong evidence, which is the difference between disagreeing and abstaining.
 *
 * The correlation is mean-removed — the profile is non-negative, so its mean alone would put a
 * pedestal under every lag — divided by the overlap count so shrinking overlap cannot tilt the
 * answer toward small lags, and normalised by the axis's own variance, so its figures are
 * comparable across axes and sheets.
 *
 * **Harmonics are resolved by descending, not by preferring coarse.** Drift is the disambiguator:
 * phase error accumulates across periods, so a true pitch outweighs its own multiples — and the
 * residual failure is *fractional* pitch, art at six and a half pixels peaking sharpest at
 * thirteen. A settled peak therefore descends to its half-lag while the half carries nearly the
 * peak's own windowed support. When the descent bar fails but the half is still a *prominent* peak
 * of its own, the axis reports the fine candidate as **octave-ambiguous** rather than swallowing
 * the coarse answer: alone, an ambiguous reading refuses — offering the double is the expensive
 * direction — but where the other axis independently lands within a pixel of it, the agreement is
 * the confirmation the descent could not give. The direction of remaining error is chosen on cost
 * throughout: offering too fine under-reduces, which the reader can see and finish; too coarse
 * merges cells for good.
 *
 * Offered under the same hedge as every estimate — a candidate to click and judge, never adopted —
 * and refused outright for profiles with too little structure, too weak a settled peak, or too few
 * repeats of the pitch across the sheet; the constants each say why.
 */
export function estimateProfilePeriod(profile: StepProfile): PixelGrid | null {
  if (profile.total === 0) return null;

  const width = profile.columns.length;
  const height = profile.rows.length;
  const shortest = Math.min(width, height);
  const ceiling = Math.min(measurableGridCeiling(width, height), Math.floor(shortest / ACF_FEWEST_REPEATS));
  if (ceiling < MIN_CORRELATED_PERIOD) return null;

  const across = axisPeriod(profile.columns, ceiling);
  const down = axisPeriod(profile.rows, ceiling);

  // Within a pixel is agreement — drift makes a fractional pitch land on either neighbour, so the
  // two axes are reading one pitch and the only question left is which integer to spell it with.
  // The finer is the cheap direction to be wrong in, and it is taken whichever axis holds it: that
  // is a choice between two spellings of one reading, not one axis overruling the other.
  // **Agreement corroborates an axis that
  // could not vouch for itself, and two that cannot corroborate nothing**: the doubts `sure` folds
  // together are all forms of "this axis is reading weak evidence", and two weak readings landing
  // together is what a *content* periodicity looks like as readily as a pixel pitch — the layout
  // fixture in this file's tests puts the same spurious 40 on both axes, because the layout is the
  // same on both.
  if (across !== null && down !== null && Math.abs(across.period - down.period) <= 1) {
    if (across.sure || down.sure) return Math.min(across.period, down.period);
    return null;
  }

  // Apart, or one axis silent. **An axis that cannot vouch for itself does not get a veto**, which
  // is the difference between disagreeing and abstaining: the sheet whose columns are polluted by
  // marks in every fourth cell settles them on 13 against a clean 6 down the rows, and refusing the
  // pair would throw away the one axis that read the sheet. A contradiction is a refusal only
  // between two axes that can each speak alone.
  const sure = [across, down].filter((reading) => reading?.sure === true);
  if (sure.length !== 1) return null;
  return sure[0]?.period ?? null;
}

/** One axis's answer: the pitch it settled on, and whether it settled it alone. */
interface AxisReading {
  readonly period: number;
  /**
   * Whether this axis can offer its pitch **on its own**, with no second axis to corroborate it.
   *
   * Three ways an axis settles on a pitch it cannot vouch for, and they are one question rather
   * than three: the descent found a division prominent but under-supported, so the octave is
   * unresolved; the pitch's own double carries less than {@link ACF_MULTIPLE_CONFIRMATION}; or the
   * pitch's own window carries less than {@link ACF_CORRELATION_FLOOR}.
   *
   * **The last two used to refuse outright**, which is what put them out of the caller's reach —
   * and each of them is one axis asking whether it is sure by itself, which is exactly the question
   * the *other* axis answers. Measured on `test_sprites/three-quarter-view_tiles1.png`, whose pitch
   * is 4: both axes settle on 4 independently, and both were refused by the double's confirmation
   * (0.055 and 0.156 against 0.3) before either could be compared with the other. Two axes landing
   * on one pitch is stronger evidence than either gate withholds, and the reconciliation in
   * {@link estimateProfilePeriod} already read agreement that way for the octave case. So all three
   * doubts now reach it the same way, and none of them loosens what a *single* axis may offer.
   */
  readonly sure: boolean;
}

/**
 * One axis's pitch: the most supported prominent local maximum, descended to its half while the
 * half carries nearly its support — through every gate the axis can apply by itself.
 */
function axisPeriod(axis: Float64Array, ceiling: number): AxisReading | null {
  const { variance, cv } = axisMoments(axis);
  // Structure first, or the correlation below is a ratio of near-zeros.
  if (cv < ACF_STRUCTURE_FLOOR || variance <= 0) return null;

  // The series every gate below reads, over the axis's first difference — see `correlogram`
  // for why the difference rather than the profile, and what its last index means. The
  // structure gate above deliberately reads the raw profile instead.
  const r = correlogram(axis, ceiling);
  if (r === null) return null;
  const highest = r.length - 1;

  // A candidate must *carry* correlation, not merely stand above its valleys: the differenced
  // domain's baseline is zero and its anticorrelation troughs are deep, so without this floor a
  // flat nothing between two troughs measures as prominent — the shape of no pitch at all.
  const best = bestSupportedPeak(r, ceiling, ceiling);
  if (best === null) return null;

  // Descend while a division's window carries nearly the settled peak's own mass. Halves *and*
  // thirds, because a fractional pitch peaks sharpest at whichever multiple lands nearest an
  // integer — art at four and a third peaks at thirteen, which no halving reaches.
  let settled = best;
  let sure = true;
  while (settled >= 2 * MIN_CORRELATED_PERIOD) {
    const taken = bestSupportedPeak(r, settled - 1, ceiling, divisionsOf(settled, ceiling));
    if (taken === null) break;
    if (windowedMass(r, taken) >= ACF_HARMONIC_DESCENT * windowedMass(r, settled)) {
      settled = taken;
      continue;
    }
    // The bar failed — but a division that is still a prominent peak of its own is an octave the
    // data cannot settle, not a refuted one. Take it as the tentative fine answer and let the
    // caller demand corroboration; swallowing the coarse peak here is how a doubled — or tripled —
    // ghost gets offered.
    settled = taken;
    sure = false;
    break;
  }

  // A genuine period correlates at its double, where the range holds one to ask — read through the
  // same clamped window as every gate, because a fractional pitch's echo lands beside the exact
  // double, flanked by the troughs a signed sum would count against it.
  if (2 * settled + 1 <= highest && windowedMass(r, 2 * settled) < ACF_MULTIPLE_CONFIRMATION) {
    sure = false;
  }
  if (windowedMass(r, settled) < ACF_CORRELATION_FLOOR) sure = false;
  return { period: settled, sure };
}
