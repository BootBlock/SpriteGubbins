import {
  ACF_CORRELATION_FLOOR,
  ACF_FEWEST_REPEATS,
  ACF_HARMONIC_DESCENT,
  ACF_MULTIPLE_CONFIRMATION,
  ACF_PROMINENCE,
  ACF_STRUCTURE_FLOOR,
  measurableGridCeiling,
  MIN_CORRELATED_PERIOD,
} from '../constants/quantiser.ts';
import type { PixelGrid } from '../types/quantiser.ts';
import { stepProfile } from './stepProfile.ts';

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
export function estimateProfilePeriod(image: ImageData): PixelGrid | null {
  const profile = stepProfile(image);
  if (profile.total === 0) return null;

  const shortest = Math.min(image.width, image.height);
  const ceiling = Math.min(
    measurableGridCeiling(image.width, image.height),
    Math.floor(shortest / ACF_FEWEST_REPEATS),
  );
  if (ceiling < MIN_CORRELATED_PERIOD) return null;

  const across = axisPeriod(profile.columns, ceiling);
  const down = axisPeriod(profile.rows, ceiling);

  // Within a pixel is agreement — drift makes a fractional pitch land on either neighbour — and the
  // finer of the two is the cheap direction to be wrong in. **Agreement corroborates an axis that
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

  // Correlate the profile's *first difference*, not the profile. A real sheet's profile rides on a
  // low-frequency envelope — art here, gutter there, a sprite's silhouette every few hundred
  // pixels — and the envelope correlates every pair of nearby lags: measured on a returned sheet,
  // the raw correlation sat between 0.5 and 0.75 at every lag from four to fourteen, and the true
  // pitch was a bump of 0.05 on that pedestal, invisible to every prominence measure. Differencing
  // is the high-pass that removes what the mean removal cannot: the comb the pixel grid contributes
  // survives it — a step's *change* recurs at the pitch exactly as the step does — while the
  // envelope, nearly constant across one position, vanishes. The structure gate above still reads
  // the raw profile, because a differenced series is near zero-mean by construction and its
  // coefficient of variation certifies nothing.
  const detail = difference(axis);
  const detailMoments = axisMoments(detail);
  if (detailMoments.variance <= 0) return null;

  // r(k) for every lag the search reads: the candidates' range widened by one on each side so the
  // ±1 windows and the flanking valleys of prominence exist at the range's edges, and 2 × ceiling
  // so a settled pitch can consult its own double.
  const highest = Math.min(2 * ceiling + 1, detail.length - 2);
  const r = new Float64Array(highest + 1);
  for (let lag = LOWEST_READABLE_LAG; lag <= highest; lag += 1) {
    r[lag] = covariance(detail, detailMoments.mean, lag) / detailMoments.variance;
  }

  // A candidate must *carry* correlation, not merely stand above its valleys: the differenced
  // domain's baseline is zero and its anticorrelation troughs are deep, so without this floor a
  // flat nothing between two troughs measures as prominent — the shape of no pitch at all.
  const best = bestSupportedPeak(r, MIN_CORRELATED_PERIOD, ceiling, ceiling);
  if (best === null) return null;

  // Descend while a division's window carries nearly the settled peak's own mass. Halves *and*
  // thirds, because a fractional pitch peaks sharpest at whichever multiple lands nearest an
  // integer — art at four and a third peaks at thirteen, which no halving reaches.
  let settled = best;
  let sure = true;
  while (settled >= 2 * MIN_CORRELATED_PERIOD) {
    const taken = bestSupportedPeak(
      r,
      MIN_CORRELATED_PERIOD,
      settled - 1,
      ceiling,
      divisionsOf(settled, ceiling),
    );
    if (taken === null) break;
    if (exclusiveMass(r, taken, settled) >= ACF_HARMONIC_DESCENT * exclusiveMass(r, settled, taken)) {
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

/** One axis's mean, variance and coefficient of variation, over positions 1 to the end. */
function axisMoments(axis: Float64Array): { mean: number; variance: number; cv: number } {
  const count = axis.length - 1;
  if (count < 1) return { mean: 0, variance: 0, cv: 0 };
  let sum = 0;
  for (let index = 1; index < axis.length; index += 1) sum += axis[index] ?? 0;
  const mean = sum / count;
  let squares = 0;
  for (let index = 1; index < axis.length; index += 1) {
    const deviation = (axis[index] ?? 0) - mean;
    squares += deviation * deviation;
  }
  const variance = squares / count;
  return { mean, variance, cv: mean > 0 ? Math.sqrt(variance) / mean : 0 };
}

/** The profile's step-to-step change: position `i` holds `axis[i + 1] − axis[i]`, index 0 unused. */
function difference(axis: Float64Array): Float64Array {
  const detail = new Float64Array(Math.max(0, axis.length - 1));
  for (let index = 1; index < axis.length - 1; index += 1) {
    detail[index] = (axis[index + 1] ?? 0) - (axis[index] ?? 0);
  }
  return detail;
}

/** The mean-removed covariance of one axis with itself at one lag, divided by the overlap count. */
function covariance(axis: Float64Array, mean: number, lag: number): number {
  const last = axis.length - 1 - lag;
  if (last < 1) return 0;
  let sum = 0;
  for (let index = 1; index <= last; index += 1) {
    sum += ((axis[index] ?? 0) - mean) * ((axis[index + lag] ?? 0) - mean);
  }
  return sum / last;
}

/**
 * The ±1 window's summed positive correlation — negative neighbours held at zero.
 *
 * The window is what a fractional pitch splits its evidence between two lags into, and every
 * consumer — peak selection, the descent bar, the correlation floor, the double's confirmation —
 * reads this one clamped measure. Clamping is not generosity: in the differenced domain every
 * genuine peak stands between *structural* anticorrelation troughs — a step's change is followed
 * by no change, then by the opposing change, at every pitch — so a signed window subtracts the
 * shape of a strong period from its own evidence, and at small pitches the window spans so much
 * of a period that the floor became unreachable however strong the art. The job of counting
 * evidence *against* a candidate belongs to the gates that do it by shape: the positivity floor,
 * the local-maximum test and prominence.
 */
function windowedMass(r: Float64Array, lag: number): number {
  return Math.max(0, r[lag - 1] ?? 0) + Math.max(0, r[lag] ?? 0) + Math.max(0, r[lag + 1] ?? 0);
}

/**
 * The most supported *prominent local maximum* in a range of lags, or `null` where the range holds
 * none.
 *
 * One shape test, read twice — by the search that settles an axis's pitch and by the descent that
 * asks whether a division of it is better supported. **The descent used to weigh its candidates by
 * windowed mass alone**, and that is the hole a small pitch falls through: at a floor of 4 a
 * division was always several lags from its neighbours, so mass and shape agreed and nothing had to
 * say which was being asked for. At a floor of 2 they part company — a period-2 comb puts a *deep
 * trough* at lag 3, flanked by the teeth at 2 and 4, and a ±1 window centred on that trough collects
 * both teeth and outscores either. Measured on `test_sprites/cyborg_healer.png`, whose pitch is 2:
 * lag 3 scores 0.885 against lag 2's 0.53, and the reading descended from 8 to 3 — a pitch the
 * correlation is *negative* at.
 *
 * A genuine harmonic of a pitch is always a local maximum of the correlation. A lag that merely sits
 * between two teeth is not, and the shape test is what tells them apart whatever the window says.
 *
 * `candidates` names the lags to consider; omitted, every lag in the range is considered.
 */
function bestSupportedPeak(
  r: Float64Array,
  lowest: number,
  highest: number,
  ceiling: number,
  candidates?: readonly number[],
): number | null {
  let best: number | null = null;
  let bestMass = -Infinity;
  const consider = (lag: number) => {
    if (lag < lowest || lag > highest) return;
    const here = r[lag] ?? 0;
    if (here < ACF_PROMINENCE) return;
    if (!risesFromTheLeft(r, lag) || here <= (r[lag + 1] ?? 0)) return;
    if (prominence(r, lag, ceiling) < ACF_PROMINENCE) return;
    const mass = windowedMass(r, lag);
    if (mass > bestMass) {
      bestMass = mass;
      best = lag;
    }
  };
  if (candidates === undefined) {
    for (let lag = lowest; lag <= highest; lag += 1) consider(lag);
  } else {
    for (const lag of candidates) consider(lag);
  }
  return best;
}

/**
 * The divisions of a settled peak a descent may consider: its half and its third, each with its two
 * neighbours.
 *
 * Halves *and* thirds, because a fractional pitch peaks sharpest at whichever multiple lands nearest
 * an integer — art at four and a third peaks at thirteen, which no halving reaches. The neighbours
 * are there because the division of a fractional pitch is itself fractional.
 */
function divisionsOf(settled: number, ceiling: number): readonly number[] {
  const divisions: number[] = [];
  for (const divisor of [2, 3]) {
    const divided = Math.round(settled / divisor);
    for (const candidate of [divided - 1, divided, divided + 1]) {
      if (candidate > ceiling || candidate >= settled) continue;
      if (!divisions.includes(candidate)) divisions.push(candidate);
    }
  }
  return divisions;
}

/**
 * One lag's windowed mass, counting only the lags the *other* lag's window does not also cover.
 *
 * **Neither side of the descent's comparison may be weighed by the other's evidence.** The two are
 * judged on ±1 windows, and where those windows overlap the shared lags support both claims at once
 * — so the comparison stops being between two readings of the sheet and becomes a reading of one lag
 * against itself. At a floor of 4 the arithmetic kept them apart unasked: the descent only ran from
 * a settled peak of 8 upward, so a division was never nearer than `settled − 2`, and the invariant
 * went unstated because nothing could break it. At a floor of 2 it stops holding. Art at four and a
 * third settles on 13 and descends correctly to 4, and 4's third has 3 as a neighbour, whose window
 * `[2, 3, 4]` is three quarters supplied by the very 4 it is being weighed against — measured on
 * that fixture, 3 scores 0.885 on borrowed evidence and nothing at all on its own.
 *
 * A flat ban on neighbouring candidates would answer that, and it would also forbid an honest
 * descent: a comb at every even lag whose most-supported tooth happens to land on 4 can only reach
 * its true 2 by stepping across the trough at 3, which carries nothing for either of them. So the
 * exclusion is of the *shared lags* rather than of nearby candidates, which is what the invariant
 * actually says.
 */
function exclusiveMass(r: Float64Array, lag: number, other: number): number {
  let mass = 0;
  for (let index = lag - 1; index <= lag + 1; index += 1) {
    if (index >= other - 1 && index <= other + 1) continue;
    mass += Math.max(0, r[index] ?? 0);
  }
  return mass;
}

/**
 * The smallest lag the correlation is *evidence* at.
 *
 * **Lag 1 is not a measurement of the sheet.** The correlation is read on the profile's first
 * difference, and differencing puts a structural trough at lag 1 whatever the image holds — a
 * step's change is followed by no change — so `r[1]` is deeply negative for a period-2 comb, for
 * smooth paint and for noise alike. Measured across the eight reference sheets in `test_sprites/`
 * it runs −0.13 to −0.83, and it says nothing about any of them.
 *
 * Nothing had to state this while the search floor was `MIN_ESTIMATED_GRID`: the lowest lag ever
 * examined was 4, and lag 1 was three positions outside every window and every valley search. At
 * {@link MIN_CORRELATED_PERIOD} it is the immediate left neighbour of the first candidate, so a
 * peak at 2 would clear the local-maximum test against it on any image, and stand a false half-unit
 * of prominence above it on any image. Both gates therefore start here, and a candidate at the
 * floor is judged on its right-hand side alone — which is honest, because there is nothing on its
 * left to judge it against.
 */
const LOWEST_READABLE_LAG = MIN_CORRELATED_PERIOD;

/**
 * Whether the correlation rises into this lag from the left — vacuously true at the floor, where
 * there is no readable lag to its left. See {@link LOWEST_READABLE_LAG}.
 */
function risesFromTheLeft(r: Float64Array, lag: number): boolean {
  if (lag <= LOWEST_READABLE_LAG) return true;
  return (r[lag] ?? 0) >= (r[lag - 1] ?? 0);
}

/**
 * How far the peak stands above the higher of the two valleys flanking it.
 *
 * **A side with no readable lags on it constrains nothing**, which is only ever the left of a peak
 * at {@link LOWEST_READABLE_LAG}. Reading the missing side as though the valley sat at the peak's
 * own height — which is what an unscanned running minimum initialised to the peak reports — makes
 * the prominence exactly zero there, so the first lag the search may consider is the one lag it can
 * never accept. On `test_sprites/cyborg_healer.png`, whose pitch is 2, that is the difference
 * between reading the sheet and refusing it.
 */
function prominence(r: Float64Array, lag: number, ceiling: number): number {
  const peak = r[lag] ?? 0;
  const left = valley(r, peak, lag - 1, LOWEST_READABLE_LAG, -1);
  const right = valley(r, peak, lag + 1, ceiling + 1, 1);
  return peak - Math.max(left, right);
}

/**
 * The lowest correlation between a peak and the next lag that rises above it, scanning one way.
 *
 * `-Infinity` where the scan has nothing to read, which is the "constrains nothing" case
 * {@link prominence} names.
 */
function valley(r: Float64Array, peak: number, from: number, until: number, step: number): number {
  let lowest = Infinity;
  for (let index = from; step < 0 ? index >= until : index <= until; index += step) {
    const here = r[index] ?? 0;
    if (here > peak) break;
    if (here < lowest) lowest = here;
  }
  return lowest === Infinity ? -Infinity : lowest;
}
