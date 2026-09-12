import { BOUNDARY_THRESHOLD_OVER_CHANCE } from '../constants/quantiser.ts';
import type { BoundaryEvidence } from './stepProfile.ts';

/**
 * The positions on one axis where the art's cell boundaries actually sit.
 *
 * The step profile's evidence says how strongly every column and row reads as a boundary; this reads
 * the positions carrying *far more of it than the axis's own background* as boundary candidates, and
 * merges the candidates a softened ramp spreads across neighbouring positions into one line each. It
 * is the shared first step of two different questions — `boundaryMesh` asks *where the cells are* for
 * a scale already chosen, and `estimateMeshPeriod` asks *what spacing the lines imply* when no integer
 * period fits — and one implementation is what stops the two disagreeing about the same sheet.
 * How far above the background a candidate has to stand is {@link boundaryFloor}, and the multiple
 * it is stated in is `BOUNDARY_THRESHOLD_OVER_CHANCE`, filed with the other calibrated thresholds
 * in `constants/quantiser.ts`.
 *
 * The evidence is magnitude on a resampled axis and transitions on a crisp one, and `stepProfile`
 * argues the difference: on crisp art a sum of magnitudes let stray pixels outweigh faint cell
 * boundaries, and the line list held the strays alone (#279).
 */

/** One detected boundary: where it sits, and how much of the axis's evidence it carries. */
export interface BoundaryLine {
  readonly position: number;
  readonly mass: number;
}

/**
 * The boundary lines on one axis, ascending.
 *
 * Candidates above {@link boundaryFloor} that touch — neighbouring positions, which is what a
 * three-tap ramp turns one boundary into — merge into a single line at their mass-weighted centre,
 * so a softened boundary reads as one line where it actually is rather than as two or three a pixel
 * apart. Position 0 is never a candidate: the first pixel has nothing before it to differ from.
 *
 * **On an axis read by transitions, a deep valley splits a run into two lines.** A crisp sheet has no
 * ramps: two neighbouring candidates on it are two changes, and at a grid of 2 or 3 a boundary always
 * touches the transitions of a stray inside the cell beside it, so a run merged whole was one line off
 * the boundary it held. A position carrying at most half of the highest candidate on *each* side of it
 * within the run is the gap between two such changes: the line closes before it, the next opens after
 * it, and it belongs to neither, since a share of it would pull both centres towards the detail between
 * them. Half is the figure {@link boundaryFloor} sets between the background and the structure, and
 * like it takes no constant. **On an axis read by magnitude a run merges whole**, as it always has: a
 * resampled sheet's neighbouring candidates are the ramp one boundary was spread across, and a ramp
 * softened unevenly can dip in its middle without being two boundaries.
 */
export function boundaryClusters(evidence: BoundaryEvidence): readonly BoundaryLine[] {
  const axis = evidence.values;
  if (axis.length < 2) return [];
  const threshold = boundaryFloor(axis);
  const splitValleys = evidence.reading === 'TRANSITIONS';
  const ahead = new Float64Array(axis.length);
  const lines: BoundaryLine[] = [];

  let start = 1;
  while (start < axis.length) {
    if ((axis[start] ?? 0) <= threshold) {
      start += 1;
      continue;
    }
    let end = start;
    while (end < axis.length && (axis[end] ?? 0) > threshold) end += 1;
    readRun(axis, { from: start, to: end, splitValleys }, ahead, lines);
    start = end;
  }

  return lines;
}

/** One run of candidates, `from` inclusive to `to` exclusive, and whether it may split at a valley. */
interface CandidateRun {
  readonly from: number;
  readonly to: number;
  readonly splitValleys: boolean;
}

/**
 * The lines in one run of candidates, appended to `lines`.
 *
 * Linear in the run: `ahead` is filled with the highest candidate after each position on the way
 * back, and the highest before it is carried on the way forward, so each position is tested against
 * both sides without walking either again. `ahead` is the caller's, allocated once for the axis.
 */
function readRun(axis: Float64Array, run: CandidateRun, ahead: Float64Array, lines: BoundaryLine[]): void {
  const { from, to, splitValleys } = run;
  let highest = 0;
  for (let position = to - 1; position >= from; position -= 1) {
    ahead[position] = highest;
    highest = Math.max(highest, axis[position] ?? 0);
  }

  let behind = 0;
  let mass = 0;
  let moment = 0;
  const close = () => {
    if (mass > 0) lines.push({ position: Math.round(moment / mass), mass });
    mass = 0;
    moment = 0;
  };

  for (let position = from; position < to; position += 1) {
    const value = axis[position] ?? 0;
    const valley = splitValleys && value * 2 <= Math.min(behind, ahead[position] ?? 0);
    behind = Math.max(behind, value);
    if (valley) {
      close();
      continue;
    }
    mass += value;
    moment += value * position;
  }
  close();
}

/**
 * How much evidence a position must carry on this axis before it reads as a boundary.
 *
 * Two demands, and the floor is whichever is higher. Each answers a way the other one alone is
 * wrong, and both are stated against {@link axisSplit}'s two levels rather than against the axis
 * mean, which is neither of them.
 *
 * **It must carry `BOUNDARY_THRESHOLD_OVER_CHANCE` times the background.** This is the demand that
 * keeps an axis with no cells in it from reporting any: noise and gradient columns sit at the
 * background by definition, so nothing on a structureless axis clears a multiple of it.
 *
 * **And it must carry at least halfway from the background to the structure.** This is the demand
 * that keeps *faint* change out where the background is degenerate. Flat-shaded art has non-boundary
 * columns that are exactly identical, so its background is zero and a multiple of it is zero too —
 * at which point a single stray step, or a sliver of interior detail worth a fiftieth of a cell
 * boundary, becomes a line and merges into the boundary beside it. Halfway between the two levels is
 * a figure rather than a calibrated threshold, so it takes no constant of its own.
 */
function boundaryFloor(axis: Float64Array): number {
  const { background, structure } = axisSplit(axis);
  return Math.max(BOUNDARY_THRESHOLD_OVER_CHANCE * background, (background + structure) / 2);
}

/** An axis's two levels: what a position carries when it is not a boundary, and when it is. */
interface AxisSplit {
  readonly background: number;
  readonly structure: number;
}

/**
 * The evidence this axis carries away from its structure, and the evidence it carries at it.
 *
 * The axis mean is neither figure: it is the two populations averaged together, so every boundary
 * and every interior mark lifts the very level they are about to be measured against. On a clean
 * sheet the mean and the background are close enough that it never showed. On a *detailed* one —
 * straps, rivets, a cross drawn through a cell, the sheets a generator actually returns — the
 * marks' own strong edges carry several times what a cell boundary carries, and they lifted the
 * mean past the boundaries themselves: the genuine lines dropped out of the list while the detail
 * that displaced them stayed in, and `boundaryMesh` walked a list that was partly detail and partly
 * missing.
 *
 * So the two levels are separated rather than averaged. Every sample starts in the background; the
 * mean of that set sets a threshold, whatever exceeds the threshold is structure and leaves the
 * set, and the mean is taken again. Removing samples worth more than twice the mean can only lower
 * the mean, so the background set shrinks on every pass and the walk stops the first pass it does
 * not — which is the fixed point, reached in a handful of passes on real profiles and bounded by
 * the sample count in the worst case. The set can never empty: the smallest sample is at most the
 * mean, so it is always below a multiple of it.
 *
 * **The structure level is a geometric mean, and the background an arithmetic one.** They are
 * summarising different things. The background is a level, and its samples scatter about it
 * additively. The structure class is a set of *magnitudes*, which vary multiplicatively — a step
 * scales with the contrast either side of it and with how many rows the feature spans — so it is
 * routinely spread over more than an order of magnitude, and one silhouette edge worth fifty cell
 * boundaries drags an arithmetic mean up past the boundaries it was meant to sit under. Twenty
 * boundaries of 100 beside one edge of 5000 average to 333, where they multiply out to 120.
 *
 * An axis with nothing above the threshold has no structure to report, and says so by naming the
 * background as both levels — which is the reading a gradient gets, and it leaves
 * {@link boundaryFloor} resting on its first demand alone.
 *
 * Position 0 is not a sample. It has nothing before it to differ from, so its zero is a property of
 * the profile's shape rather than a measurement, and averaging it in would pull both levels below
 * the sheet on every axis.
 */
function axisSplit(axis: Float64Array): AxisSplit {
  let count = axis.length - 1;
  let sum = 0;
  for (let position = 1; position < axis.length; position += 1) sum += axis[position] ?? 0;

  for (;;) {
    const background = sum / count;
    const threshold = BOUNDARY_THRESHOLD_OVER_CHANCE * background;
    let lowSum = 0;
    let lowCount = 0;
    let highLogSum = 0;
    let highCount = 0;
    for (let position = 1; position < axis.length; position += 1) {
      const mass = axis[position] ?? 0;
      if (mass > threshold) {
        // Every member of this set exceeds the threshold, which is never negative, so each is
        // strictly positive and has a logarithm.
        highLogSum += Math.log(mass);
        highCount += 1;
      } else {
        lowSum += mass;
        lowCount += 1;
      }
    }
    if (lowCount === count) {
      return { background, structure: highCount > 0 ? Math.exp(highLogSum / highCount) : background };
    }
    sum = lowSum;
    count = lowCount;
  }
}
