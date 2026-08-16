import {
  ACF_CORRELATION_FLOOR,
  ACF_FEWEST_REPEATS,
  ACF_HARMONIC_DESCENT,
  ACF_MULTIPLE_CONFIRMATION,
  ACF_PROMINENCE,
  ACF_STRUCTURE_FLOOR,
  measurableGridCeiling,
  MIN_ESTIMATED_GRID,
} from '../constants/quantiser.ts';
import type { PixelGrid } from '../types/quantiser.ts';
import { stepProfile } from './stepProfile.ts';

/**
 * The scale of a sheet read from the *whole* step profile, by autocorrelation — one axis at a time.
 *
 * The reading that serves real generated sheets, whose interior detail defeats every line-list
 * approach: straps, crosses and rivets put strong edges between the cell boundaries, polluting any
 * statistic built from detected lines — and inflating the chance floor those lines are detected
 * against, so genuine boundaries can drop out of the list while detail stays in. Correlating a
 * profile against a shifted copy of itself uses all of the mass, unthresholded: the periodic
 * component the pixel grid contributes still peaks at multiples of the pitch however much broadband
 * detail rides on top of it.
 *
 * **Each axis is read alone, and the two answers are reconciled afterwards.** Summing the axes'
 * covariances first read as one number, and that was its defect: detail patterned along one axis
 * can *anticorrelate* at the true pitch, and in the summed form that anticorrelation cancelled the
 * other axis's clean fundamental — the reading then offered the pitch's double, which merges the
 * art's cells for good. Read apart, the polluted axis refuses or disagrees, and disagreement is a
 * refusal rather than an average.
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
  if (ceiling < MIN_ESTIMATED_GRID) return null;

  const across = axisPeriod(profile.columns, ceiling);
  const down = axisPeriod(profile.rows, ceiling);

  if (across !== null && down !== null) {
    // Within a pixel is agreement — drift makes a fractional pitch land on either neighbour — and
    // the finer of the two is the cheap direction to be wrong in. Further apart is a
    // contradiction, and a contradiction is a refusal, never an average.
    if (Math.abs(across.period - down.period) > 1) return null;
    return Math.min(across.period, down.period);
  }

  const alone = across ?? down;
  if (alone === null) return null;
  // An unconfirmed octave with no second axis to corroborate it stays unoffered.
  return alone.sure ? alone.period : null;
}

/** One axis's answer: the pitch it settled on, and whether it settled it alone. */
interface AxisReading {
  readonly period: number;
  /** `false` when the peak's half was prominent but under-supported — the octave-ambiguous case. */
  readonly sure: boolean;
}

/**
 * One axis's pitch: the most supported prominent local maximum, descended to its half while the
 * half carries nearly its support — through every gate the axis can apply by itself.
 */
function axisPeriod(axis: Float64Array, ceiling: number): AxisReading | null {
  const { mean, variance, cv } = axisMoments(axis);
  // Structure first, or the correlation below is a ratio of near-zeros.
  if (cv < ACF_STRUCTURE_FLOOR || variance <= 0) return null;

  // r(k) for every lag the search reads: the candidates' range widened by one on each side so the
  // ±1 windows and the flanking valleys of prominence exist at the range's edges, and 2 × ceiling
  // so a settled pitch can consult its own double.
  const highest = Math.min(2 * ceiling + 1, axis.length - 2);
  const r = new Float64Array(highest + 1);
  for (let lag = Math.max(1, MIN_ESTIMATED_GRID - 1); lag <= highest; lag += 1) {
    r[lag] = covariance(axis, mean, lag) / variance;
  }

  let best: number | null = null;
  let bestMass = -Infinity;
  for (let lag = MIN_ESTIMATED_GRID; lag <= ceiling; lag += 1) {
    const here = r[lag] ?? 0;
    if (here < (r[lag - 1] ?? 0) || here <= (r[lag + 1] ?? 0)) continue;
    if (prominence(r, lag, ceiling) < ACF_PROMINENCE) continue;
    const mass = windowedMass(r, lag);
    if (mass > bestMass) {
      bestMass = mass;
      best = lag;
    }
  }
  if (best === null) return null;

  // Descend while a division's window carries nearly the settled peak's own mass. Halves *and*
  // thirds, because a fractional pitch peaks sharpest at whichever multiple lands nearest an
  // integer — art at four and a third peaks at thirteen, which no halving reaches.
  let settled = best;
  let sure = true;
  while (settled >= 2 * MIN_ESTIMATED_GRID) {
    const candidates: number[] = [];
    for (const divisor of [2, 3]) {
      const divided = Math.round(settled / divisor);
      for (const candidate of [divided - 1, divided, divided + 1]) {
        if (candidate < MIN_ESTIMATED_GRID || candidate >= settled || candidate > ceiling) continue;
        if (!candidates.includes(candidate)) candidates.push(candidate);
      }
    }
    let taken: number | null = null;
    let takenMass = -Infinity;
    for (const candidate of candidates) {
      const mass = windowedMass(r, candidate);
      if (mass > takenMass) {
        takenMass = mass;
        taken = candidate;
      }
    }
    if (taken === null) break;
    if (takenMass >= ACF_HARMONIC_DESCENT * windowedMass(r, settled)) {
      settled = taken;
      continue;
    }
    // The bar failed — but a division that is still a prominent peak of its own is an octave the
    // data cannot settle, not a refuted one. Take the most supported such peak as the tentative
    // fine answer and let the caller demand corroboration; swallowing the coarse peak here is how
    // a doubled — or tripled — ghost gets offered.
    let tentative: number | null = null;
    let tentativeMass = -Infinity;
    for (const candidate of candidates) {
      const here = r[candidate] ?? 0;
      if (here < (r[candidate - 1] ?? 0) || here <= (r[candidate + 1] ?? 0)) continue;
      if (prominence(r, candidate, ceiling) < ACF_PROMINENCE) continue;
      const mass = windowedMass(r, candidate);
      if (mass > tentativeMass) {
        tentativeMass = mass;
        tentative = candidate;
      }
    }
    if (tentative !== null) {
      settled = tentative;
      sure = false;
    }
    break;
  }

  if (sure) {
    // A genuine period correlates at its double, where the range holds one to ask. Signed, because
    // a *negative* neighbourhood at the double is evidence against the pitch, not absent evidence.
    if (2 * settled + 1 <= highest && windowedMass(r, 2 * settled) < ACF_MULTIPLE_CONFIRMATION) {
      return null;
    }
    if (windowedSupport(r, settled) < ACF_CORRELATION_FLOOR) return null;
  }
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
 * The ±1 window's summed correlation, signed — what a fractional pitch splits between two lags,
 * and what peak selection, descent and the double's confirmation all weigh, because for those a
 * negative neighbour is evidence.
 */
function windowedMass(r: Float64Array, lag: number): number {
  return (r[lag - 1] ?? 0) + (r[lag] ?? 0) + (r[lag + 1] ?? 0);
}

/**
 * The window's *support*: negative neighbours held at zero.
 *
 * The correlation floor's measure, and the clamping is what admits small drifting pitches at all:
 * at a pitch of four the window spans most of a period, so one neighbour sits in the
 * anticorrelation trough *by geometry* — subtracting it made the floor unreachable below five for
 * every drifting sheet, however strong the pitch. A trough is not evidence against the peak beside
 * it; it is the shape a strong period has.
 */
function windowedSupport(r: Float64Array, lag: number): number {
  return Math.max(0, r[lag - 1] ?? 0) + (r[lag] ?? 0) + Math.max(0, r[lag + 1] ?? 0);
}

/** How far the peak stands above the higher of the two valleys flanking it. */
function prominence(r: Float64Array, lag: number, ceiling: number): number {
  const peak = r[lag] ?? 0;
  let leftValley = peak;
  for (let index = lag - 1; index >= Math.max(1, MIN_ESTIMATED_GRID - 1); index -= 1) {
    const here = r[index] ?? 0;
    if (here > peak) break;
    if (here < leftValley) leftValley = here;
  }
  let rightValley = peak;
  for (let index = lag + 1; index <= ceiling + 1; index += 1) {
    const here = r[index] ?? 0;
    if (here > peak) break;
    if (here < rightValley) rightValley = here;
  }
  return peak - Math.max(leftValley, rightValley);
}
