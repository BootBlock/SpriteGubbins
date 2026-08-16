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
 * The scale of a sheet read from the *whole* step profile at once, by autocorrelation.
 *
 * The reading that serves real generated sheets, whose interior detail defeats every line-list
 * approach: straps, crosses and rivets put strong edges between the cell boundaries, polluting any
 * statistic built from detected lines — and inflating the chance floor those lines are detected
 * against, so genuine boundaries can drop out of the list while detail stays in. Correlating the
 * profile against a shifted copy of itself uses all of the mass, unthresholded: the periodic
 * component the pixel grid contributes still peaks at multiples of the pitch however much
 * broadband detail rides on top of it.
 *
 * The correlation is mean-removed — the profile is non-negative, so its mean alone would put a
 * pedestal under every lag — divided by the overlap count so shrinking overlap cannot tilt the
 * answer toward small lags, and normalised by variance so the two axes combine by summing
 * covariances over summed variances: an axis with no structure contributes nothing rather than
 * diluting the answer.
 *
 * **Harmonics are resolved by descending, not by preferring coarse.** Drift is the disambiguator:
 * phase error accumulates across periods, so a true pitch outweighs its own multiples — and the
 * residual failure is *fractional* pitch, art at six and a half pixels peaking sharpest at
 * thirteen. A settled peak therefore descends to its half-lag while the half carries nearly the
 * peak's own windowed support, and the direction of remaining error is chosen on cost: offering
 * too fine under-reduces, which the reader can see and finish; too coarse merges the art's cells
 * for good.
 *
 * Offered under the same hedge as every estimate — a candidate to click and judge, never adopted —
 * and refused outright for profiles with too little structure, too weak a settled peak, or too few
 * repeats of the pitch across the sheet; the constants each say why.
 */
export function estimateProfilePeriod(image: ImageData): PixelGrid | null {
  const profile = stepProfile(image);
  if (profile.total === 0) return null;

  const x = axisMoments(profile.columns);
  const y = axisMoments(profile.rows);
  // Structure on at least one axis, or the correlation below is a ratio of near-zeros.
  if (x.cv < ACF_STRUCTURE_FLOOR && y.cv < ACF_STRUCTURE_FLOOR) return null;
  const variance = x.variance + y.variance;
  if (variance <= 0) return null;

  const shortest = Math.min(image.width, image.height);
  const ceiling = Math.min(
    measurableGridCeiling(image.width, image.height),
    Math.floor(shortest / ACF_FEWEST_REPEATS),
  );
  if (ceiling < MIN_ESTIMATED_GRID) return null;

  // r(k) for every lag the search reads: the candidates' range widened by one on each side so the
  // ±1 windows and the flanking valleys of prominence exist at the range's edges, and 2 × ceiling
  // so a settled pitch can consult its own double.
  const highest = Math.min(2 * ceiling + 1, Math.min(profile.columns.length, profile.rows.length) - 2);
  const r = new Float64Array(highest + 1);
  for (let lag = Math.max(1, MIN_ESTIMATED_GRID - 1); lag <= highest; lag += 1) {
    r[lag] = (covariance(profile.columns, x.mean, lag) + covariance(profile.rows, y.mean, lag)) / variance;
  }

  const settled = settlePeak(r, ceiling);
  if (settled === null) return null;

  // A genuine period correlates at its double, where the range holds one to ask. Both this check
  // and the floor below read the ±1 window rather than the single lag: drift splits a fundamental
  // between neighbouring lags and smears its echo the same way, and a single-lag gate would
  // under-measure exactly the sheets this reading serves.
  if (2 * settled + 1 <= highest && windowedMass(r, 2 * settled) < ACF_MULTIPLE_CONFIRMATION) {
    return null;
  }
  return windowedMass(r, settled) >= ACF_CORRELATION_FLOOR ? settled : null;
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
 * The candidate pitch: the most supported prominent local maximum, descended to its half while the
 * half carries nearly its support.
 */
function settlePeak(r: Float64Array, ceiling: number): number | null {
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

  // Descend by halving while the half-lag's window carries nearly the settled peak's own mass.
  let settled = best;
  while (settled >= 2 * MIN_ESTIMATED_GRID) {
    const half = Math.round(settled / 2);
    let taken: number | null = null;
    let takenMass = -Infinity;
    for (const candidate of [half - 1, half, half + 1]) {
      if (candidate < MIN_ESTIMATED_GRID || candidate > ceiling) continue;
      const mass = windowedMass(r, candidate);
      if (mass > takenMass) {
        takenMass = mass;
        taken = candidate;
      }
    }
    if (taken === null || takenMass < ACF_HARMONIC_DESCENT * windowedMass(r, settled)) break;
    settled = taken;
  }
  return settled;
}

/** The ±1 window's summed correlation — what a fractional pitch splits between two lags. */
function windowedMass(r: Float64Array, lag: number): number {
  return (r[lag - 1] ?? 0) + (r[lag] ?? 0) + (r[lag + 1] ?? 0);
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
