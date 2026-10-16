import { MIN_CORRELATED_PERIOD } from '../constants/quantiser.ts';
import { windowCentroid } from './correlationPeaks.ts';

/**
 * The pitch a settled correlation peak measures, to a fraction of a pixel: the finer of two
 * readings of it, where the second can be trusted.
 *
 * The gates read whole lags, and the offer needs the fraction they round away, because a pitch of
 * 6.75 settles on the peak at 7 and 7 is the coarse side of it. `windowCentroid` of the settled peak
 * is the first reading, and it is exact on softened art, whose ramps leave the peak's neighbours
 * holding the two spacings in proportion. **On crisp art it leans toward the commoner spacing**: a
 * boundary one spacing on sits a pixel past the other, and its difference lands in the other's
 * trough, so jittered crisp art at 4.75 centres its fundamental on 5.
 *
 * The second reading is the tallest multiple the descent started from, `best`, divided by how many
 * pitches it spans. It is tallest because it lands nearest an integer — 19 for 4.75 — so its
 * centroid is close to exact, and its error is divided by the pitches it spans: that jittered crisp
 * art reads 4.75 there. The two readings measure one fraction, so where they disagree the finer is
 * the cheap direction to be wrong in, as it is between two axes.
 *
 * **The count of pitches is only trusted where it is unambiguous**, because a miscount moves the
 * pitch by a whole share of it: a descent may settle on a neighbour of a division, and 9 over a
 * fundamental of 6 is one and a half, which rounds to two and reads 4.5 off a peak at 6. So the
 * multiple must land within the ±1 window every gate reads of the pitches counted, and the refined
 * pitch must stay on the settled peak — inside its window, and not under the lowest lag the
 * correlation is evidence at. Otherwise the fundamental's own reading stands.
 */
export function fractionalPitch(r: Float64Array, best: number, settled: number): number {
  const fundamental = windowCentroid(r, settled);
  const spans = Math.max(1, Math.round(best / fundamental));
  const refined = windowCentroid(r, best) / spans;
  const counted = Math.abs(best - spans * fundamental) <= 1;
  const onThePeak = refined > settled - 1 && refined >= MIN_CORRELATED_PERIOD;
  return counted && onThePeak ? Math.min(fundamental, refined) : fundamental;
}
