import { boxSum, bottomSum, topSum, WU_SIDE, type WuAxis, type WuBox, type WuMoments } from './wuMoments.ts';

/**
 * Wu's search: carve the colour cube into boxes, always splitting the one that still holds the most
 * variance, at the cut that removes the most of it.
 *
 * This is the coarse half of the palette search — coarse because it works over the 32-bin-per-channel
 * moment table, which is exactly what makes it fast and what bounds what it can see. It settles the
 * *structure* of the palette at a cost that barely moves with the sheet's size or the budget, since
 * the work is the table's; `exactSplit.ts` refines whatever it could not separate at that resolution.
 *
 * Wu, *Efficient Statistical Computations for Optimal Color Quantization*, Graphics Gems II (1991).
 *
 * Deterministic throughout: every tie resolves to the earliest candidate, and the axes are always
 * walked red, green, blue.
 */

/** The bins a box spans, as `(low, high]` on each axis — the whole cube before any cut. */
function wholeCube(): WuBox {
  return { r0: 0, r1: WU_SIDE - 1, g0: 0, g1: WU_SIDE - 1, b0: 0, b1: WU_SIDE - 1 };
}

/**
 * Split the box that still holds the most variance, until the budget is spent or nothing left will
 * separate at bin resolution.
 *
 * The variance of each box is kept beside it and refreshed only for the two a cut produced, which is
 * what keeps the loop proportional to the palette size rather than to its square. A box that will
 * not cut has its variance zeroed, so it is never chosen again and the loop always ends.
 */
export function partition(moments: WuMoments, maxColors: number): readonly WuBox[] {
  const boxes: WuBox[] = [wholeCube()];
  // Seeded with the whole cube's own variance rather than zero: the search picks its target before
  // it cuts, so a zero here would retire the only box there is and return a palette of one.
  const variances: number[] = [boxVariance(moments, boxes[0] ?? wholeCube())];

  while (boxes.length < maxColors) {
    let chosen = -1;
    let worst = 0;
    for (const [index, held] of variances.entries()) {
      // Strictly greater, so the earliest box wins a tie and the split order is fixed.
      if (held > worst) {
        worst = held;
        chosen = index;
      }
    }
    // Every remaining box is a single bin, or holds one colour: no variance left to remove here.
    if (chosen === -1) break;

    const box = boxes[chosen];
    if (box === undefined) break;
    const half = cut(moments, box);
    if (half === null) {
      // Not splittable after all — retire it rather than reconsidering it forever.
      variances[chosen] = 0;
      continue;
    }

    variances[chosen] = boxVariance(moments, box);
    boxes.push(half);
    variances.push(boxVariance(moments, half));
  }

  return boxes;
}

/**
 * Cut a box at the position that removes the most variance, returning the upper half — or `null`
 * where no cut on any axis separates anything.
 *
 * `box` is narrowed in place to the lower half, which is what lets the caller keep its index.
 */
function cut(moments: WuMoments, box: WuBox): WuBox | null {
  const wholeWeight = boxSum(box, moments.weight);
  const whole = {
    r: boxSum(box, moments.red),
    g: boxSum(box, moments.green),
    b: boxSum(box, moments.blue),
  };

  let bestAxis: WuAxis | null = null;
  let bestAt = -1;
  let best = 0;
  // Red, then green, then blue: a fixed order, so an exact tie between two axes always resolves the
  // same way.
  for (const axis of ['r', 'g', 'b'] as const) {
    const found = bestCut(moments, box, axis, wholeWeight, whole);
    if (found !== null && found.score > best) {
      best = found.score;
      bestAxis = axis;
      bestAt = found.at;
    }
  }
  if (bestAxis === null) return null;

  const half: WuBox = { ...box };
  // The cut plane becomes the upper half's exclusive lower bound and the lower half's inclusive
  // upper one, so together they cover exactly what the box covered.
  if (bestAxis === 'r') {
    half.r0 = bestAt;
    box.r1 = bestAt;
  } else if (bestAxis === 'g') {
    half.g0 = bestAt;
    box.g1 = bestAt;
  } else {
    half.b0 = bestAt;
    box.b1 = bestAt;
  }
  return half;
}

/**
 * The best cut position along one axis, scored by the sum of the two halves' squared means.
 *
 * Maximising that sum is the same decision as minimising the within-box variance the cut leaves
 * behind — the total is fixed, so whatever the halves' means account for is variance removed. A
 * position leaving either half empty is not a cut and is skipped rather than scored.
 */
function bestCut(
  moments: WuMoments,
  box: WuBox,
  axis: WuAxis,
  wholeWeight: number,
  whole: { r: number; g: number; b: number },
): { at: number; score: number } | null {
  const base = {
    w: bottomSum(box, axis, moments.weight),
    r: bottomSum(box, axis, moments.red),
    g: bottomSum(box, axis, moments.green),
    b: bottomSum(box, axis, moments.blue),
  };
  const first = (axis === 'r' ? box.r0 : axis === 'g' ? box.g0 : box.b0) + 1;
  const last = axis === 'r' ? box.r1 : axis === 'g' ? box.g1 : box.b1;

  let at = -1;
  let score = 0;
  for (let position = first; position < last; position += 1) {
    const lowWeight = base.w + topSum(box, axis, position, moments.weight);
    if (lowWeight <= 0) continue;
    const highWeight = wholeWeight - lowWeight;
    if (highWeight <= 0) continue;

    const low = {
      r: base.r + topSum(box, axis, position, moments.red),
      g: base.g + topSum(box, axis, position, moments.green),
      b: base.b + topSum(box, axis, position, moments.blue),
    };
    const high = { r: whole.r - low.r, g: whole.g - low.g, b: whole.b - low.b };
    const total =
      (low.r * low.r + low.g * low.g + low.b * low.b) / lowWeight +
      (high.r * high.r + high.g * high.g + high.b * high.b) / highWeight;

    // Strictly greater, so the lowest qualifying position wins a tie.
    if (total > score) {
      score = total;
      at = position;
    }
  }

  return at === -1 ? null : { at, score };
}

/** How much colour variance a box still holds — what the search is trying to drive out of it. */
function boxVariance(moments: WuMoments, box: WuBox): number {
  const weight = boxSum(box, moments.weight);
  if (weight <= 0) return 0;
  const r = boxSum(box, moments.red);
  const g = boxSum(box, moments.green);
  const b = boxSum(box, moments.blue);
  return boxSum(box, moments.squares) - (r * r + g * g + b * b) / weight;
}
