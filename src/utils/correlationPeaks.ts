import { ACF_PROMINENCE, MIN_CORRELATED_PERIOD } from '../constants/quantiser.ts';

/**
 * The autocorrelation of one profile axis, and how a peak in it is judged.
 *
 * Split out of `profilePeriod.ts`, which reads a sheet's pitch out of what this returns. The two
 * are separate responsibilities and the boundary is where they stop sharing a vocabulary: nothing
 * here knows what a sheet, a grid or a pair of axes is. It takes a step profile along one axis and
 * answers two questions about the correlation series — what it looks like at every lag, and which
 * lag in a range is the best-supported prominent local maximum. Every claim about *pitch* — the
 * harmonic descent, the doubts an axis can hold, the reconciliation of two axes — lives on the
 * other side of that line.
 */
/**
 * The correlation series of one axis's **first difference**, or `null` where the difference holds
 * no variance to divide by.
 *
 * Correlate the profile's first difference, not the profile. A real sheet's profile rides on a
 * low-frequency envelope — art here, gutter there, a sprite's silhouette every few hundred
 * pixels — and the envelope correlates every pair of nearby lags: measured on a returned sheet,
 * the raw correlation sat between 0.5 and 0.75 at every lag from four to fourteen, and the true
 * pitch was a bump of 0.05 on that pedestal, invisible to every prominence measure. Differencing
 * is the high-pass that removes what the mean removal cannot: the comb the pixel grid contributes
 * survives it — a step's *change* recurs at the pitch exactly as the step does — while the
 * envelope, nearly constant across one position, vanishes. The caller's structure gate still reads
 * the *raw* profile, because a differenced series is near zero-mean by construction and its
 * coefficient of variation certifies nothing.
 *
 * The series runs to `2 × ceiling + 1`: the candidates' range widened by one on each side so the
 * ±1 windows and the flanking valleys of prominence exist at the range's edges, and doubled so a
 * settled pitch can consult its own double. The highest lag it reaches is therefore its own last
 * index, which is what a caller asking whether a double is readable compares against.
 */
export function correlogram(axis: Float64Array, ceiling: number): Float64Array | null {
  const detail = difference(axis);
  const moments = axisMoments(detail);
  if (moments.variance <= 0) return null;

  const highest = Math.min(2 * ceiling + 1, detail.length - 2);
  const r = new Float64Array(highest + 1);
  for (let lag = LOWEST_READABLE_LAG; lag <= highest; lag += 1) {
    r[lag] = covariance(detail, moments.mean, lag) / moments.variance;
  }
  return r;
}

/** One axis's mean, variance and coefficient of variation, over positions 1 to the end. */
export function axisMoments(axis: Float64Array): { mean: number; variance: number; cv: number } {
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
export function windowedMass(r: Float64Array, lag: number): number {
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
 * **It is also what keeps the two sides of the descent's comparison honest.** They are weighed by
 * ±1 windows, so windows that overlap would have the shared lags supporting both claims at once —
 * and a candidate two lags from the settled peak shares one. Two prominent local maxima can never be
 * *adjacent*, so the only lag they can share is the one between them, which is below both by
 * definition and clamped to zero wherever it is a trough. Requiring the shape is therefore what
 * bounds the overlap, rather than a second rule about how far apart the two may sit.
 *
 * The range runs from {@link MIN_CORRELATED_PERIOD} to `highest`; `ceiling` is how far
 * {@link prominence} may scan for a flanking valley, which is the whole search range rather than
 * this one. `candidates` names the lags to consider; omitted, every lag in the range is considered.
 */
export function bestSupportedPeak(
  r: Float64Array,
  highest: number,
  ceiling: number,
  candidates?: readonly number[],
): number | null {
  let best: number | null = null;
  let bestMass = -Infinity;
  const consider = (lag: number) => {
    if (lag < MIN_CORRELATED_PERIOD || lag > highest) return;
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
    for (let lag = MIN_CORRELATED_PERIOD; lag <= highest; lag += 1) consider(lag);
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
export function divisionsOf(settled: number, ceiling: number): readonly number[] {
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
 * The smallest lag the correlation is *evidence* at.
 *
 * **Lag 1 is not a measurement of the sheet.** The correlation is read on the profile's first
 * difference, and differencing puts a structural trough at lag 1 whatever the image holds — a
 * step's change is followed by no change — so `r[1]` is deeply negative for a period-2 comb, for
 * smooth paint and for noise alike. Measured across the eight reference sheets in `test_sprites/`
 * it runs −0.13 to −0.83, and it says nothing about any of them.
 *
 * Nothing had to state this while the search floor was `MIN_ESTIMATED_GRID`: the lowest lag read
 * anywhere was 3 — one below the floor, which is as far as a window or a valley scan reached — so
 * lag 1 sat two positions outside all of them and was never consulted. At
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
