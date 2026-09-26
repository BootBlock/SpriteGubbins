/** A point on four axes, as `nearestPointSearch` indexes it. */
export type Point4 = readonly [number, number, number, number];

/** The four axes of a {@link Point4}, in order. */
type Axis = 0 | 1 | 2 | 3;
const AXES: readonly Axis[] = [0, 1, 2, 3];

/**
 * A search for the point closest to a query, by squared Euclidean distance across four axes, the
 * earliest point taking a tie. It answers with the point's index, or `-1` where there are no points.
 *
 * **One search, two spaces.** `nearestColorSearch` asks it about a palette in RGBA bytes, which is
 * how a sheet is redrawn, and `lloydRefine` asks it about palette entries in scaled OKLab with
 * coverage as the fourth axis, which is how a palette is refined. Both are asked once per distinct
 * colour of a sheet that can carry hundreds of thousands, and the pruning below is the half that
 * would quietly diverge if it were written twice.
 *
 * **Why an index rather than a loop over the points.** The points are sorted on the axis they spread
 * widest across and held in flat typed arrays, and the search walks outwards from the query's own
 * position on that axis. The gap on that one axis is a floor under the whole distance, so each
 * direction stops at the first point whose gap alone is further than the best found, and a candidate
 * is abandoned as soon as its partial distance passes the best.
 *
 * **The answer is the brute force's, exactly, and the tie-break is what that costs.** A direction
 * stops only when its gap is *strictly* further than the best, because a point exactly as far away
 * still wins if it came earlier — the order is the caller's, and a pinned palette's order decides
 * the sheet.
 */
export function nearestPointSearch(
  points: readonly Point4[],
): (q0: number, q1: number, q2: number, q3: number) => number {
  const axis = widestAxis(points);
  const [first = 0, second = 0, third = 0] = AXES.filter((other) => other !== axis);
  const sorted = points
    .map((point, index) => ({ point, index }))
    .sort((left, right) => left.point[axis] - right.point[axis] || left.index - right.index);

  const axisValues = Float64Array.from(sorted, ({ point }) => point[axis]);
  const firstValues = Float64Array.from(sorted, ({ point }) => point[first]);
  const secondValues = Float64Array.from(sorted, ({ point }) => point[second]);
  const thirdValues = Float64Array.from(sorted, ({ point }) => point[third]);
  const indices = Int32Array.from(sorted, ({ index }) => index);
  const count = sorted.length;

  return (q0, q1, q2, q3) => {
    const target = pick(axis, q0, q1, q2, q3);
    const firstTarget = pick(first, q0, q1, q2, q3);
    const secondTarget = pick(second, q0, q1, q2, q3);
    const thirdTarget = pick(third, q0, q1, q2, q3);

    let bestIndex = -1;
    let shortest = Infinity;

    /** Scores one sorted position; `false` once its axis gap alone rules it and every point beyond it out. */
    const visit = (position: number): boolean => {
      const gap = (axisValues[position] ?? 0) - target;
      let distance = gap * gap;
      if (distance > shortest) return false;
      let delta = (firstValues[position] ?? 0) - firstTarget;
      distance += delta * delta;
      if (distance > shortest) return true;
      delta = (secondValues[position] ?? 0) - secondTarget;
      distance += delta * delta;
      if (distance > shortest) return true;
      delta = (thirdValues[position] ?? 0) - thirdTarget;
      distance += delta * delta;
      const index = indices[position] ?? 0;
      if (distance < shortest || (distance === shortest && index < bestIndex)) {
        shortest = distance;
        bestIndex = index;
      }
      return true;
    };

    let above = lowerBound(axisValues, target);
    let below = above - 1;
    while (above < count || below >= 0) {
      // The nearer side first, so the best found tightens as fast as it can.
      const takeAbove =
        below < 0 ||
        (above < count && (axisValues[above] ?? 0) - target <= target - (axisValues[below] ?? 0));
      if (takeAbove) {
        above = visit(above) ? above + 1 : count;
      } else {
        below = visit(below) ? below - 1 : -1;
      }
    }

    return bestIndex;
  };
}

/** The query's value on one axis, chosen without building an array per query. */
function pick(axis: number, q0: number, q1: number, q2: number, q3: number): number {
  if (axis === 0) return q0;
  if (axis === 1) return q1;
  return axis === 2 ? q2 : q3;
}

/**
 * The axis the points differ across most, by variance, the earlier axis taking a tie.
 *
 * The search is only as fast as that one axis separates the points: sorted on an axis they all
 * share, which alpha is for a machine's palette, every gap is zero and the search visits everything.
 * The choice changes how many points are visited, never which one wins.
 */
function widestAxis(points: readonly Point4[]): Axis {
  let widest: Axis = 0;
  let widestSpread = -1;
  for (const axis of AXES) {
    let sum = 0;
    let sumOfSquares = 0;
    for (const point of points) {
      sum += point[axis];
      sumOfSquares += point[axis] * point[axis];
    }
    // Scaled by the count squared rather than divided, which keeps byte arithmetic in integers.
    const spread = points.length * sumOfSquares - sum * sum;
    if (spread > widestSpread) {
      widestSpread = spread;
      widest = axis;
    }
  }
  return widest;
}

/** The first position whose value is at least `target`, or the length when none is. */
function lowerBound(values: Float64Array, target: number): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if ((values[middle] ?? 0) < target) low = middle + 1;
    else high = middle;
  }
  return low;
}
