import type { PixelShift } from '../types/quantiser.ts';

/** The regular layout a strip's frames were fitted to: where it starts, and how far apart it steps. */
export interface FrameLattice {
  /** Where frame zero's slot sits, relative to frame zero's own measured position. */
  readonly origin: PixelShift;
  /** How far each slot steps from the one before it, in drawn pixels — fractional, deliberately. */
  readonly pitch: PixelShift;
}

/**
 * The regular layout that best explains where a strip's frames actually are.
 *
 * The frames arrive as measured positions — one shift per frame, relative to the first, from
 * `registerFrame` — and the question this answers is which *evenly spaced* row of slots those
 * positions are a noisy reading of. Everything the alignment pass reports is the difference between
 * the two, so this is where the word "drift" is given its meaning: a frame has drifted when it sits
 * somewhere the row's own regularity does not put it.
 *
 * **Fitted by medians, not by least squares, and the difference is the whole point.** A least-squares
 * line is pulled toward every outlier in proportion to how far out it is — so the one frame that
 * genuinely wandered would drag the lattice a fraction of its own error toward itself, quietly
 * reporting a smaller drift for the frame that is wrong and a fresh drift for every frame that was
 * right. That is the shape of failure this pass cannot afford: it would spread one frame's error
 * across the whole row and then move the frames that were already where they belonged.
 *
 * **The spacing is Siegel's repeated median, and the reason is a choice that was measured and
 * changed.** The obvious estimator is the median of the gaps between *neighbours*, and it is robust
 * — but it can only ever return a spacing built from whole-pixel gaps, and the spacings on a real
 * sheet are not whole. A row laid out at 128 source pixels a frame, read at a grid of 6, sits at
 * 21⅓ drawn pixels. Five of its frames land at 0, 21, 43, 64, 85; the neighbour gaps are 21, 22,
 * 21, 21, and the median of those is a whole 21 — a lattice that puts the first two frames a pixel
 * from their slots when every one of them is already as close to its slot as whole pixels allow.
 * At the strictest tolerance a snap would move two frames of an evenly spaced row, and it gets
 * worse the longer the row: nine frames of that spacing report a drift of two at the far end. The
 * repeated median takes, for each frame, the median of the slopes from it to every other frame, and
 * then the median of those — so the long baselines that carry the fraction are in the answer, and a
 * minority of bad frames still cannot reach it. It returns 21.33 on that row, and no frame drifts.
 *
 * **Four frames is not enough to show the difference**, which is worth knowing before anyone
 * re-measures this: at that length the origin median lands on a half and the truncation below takes
 * both estimators to zero. The disagreement starts at five.
 *
 * **Two medians rather than one**, because a row can be regular and still sit somewhere unexpected.
 * The first fixes the *spacing*; the second fixes where the row *starts*, from what each frame's
 * position has left over once its share of that spacing is taken off. Without the second, the
 * lattice would be pinned to frame zero — and a strip whose first frame is the drifting one would
 * report every other frame as wrong.
 *
 * **The pitch stays fractional**, per the worked figure above. {@link slotOf} is where the rounding
 * belongs, once, at the point a slot has to name a pixel.
 *
 * Pure, and quadratic in a frame count `SCATTERED_SPRITE_CEILING` already bounds. `shifts` must hold
 * at least two entries, which `SMALLEST_STRIP_FRAMES` guarantees at the one call site; an empty list
 * is not a strip and has no layout to fit.
 */
export function fitLattice(shifts: readonly PixelShift[]): FrameLattice {
  const pitch = {
    x: repeatedMedianSlope(shifts.map((shift) => shift.x)),
    y: repeatedMedianSlope(shifts.map((shift) => shift.y)),
  };
  return {
    pitch,
    origin: {
      x: median(shifts.map((shift, index) => shift.x - index * pitch.x)),
      y: median(shifts.map((shift, index) => shift.y - index * pitch.y)),
    },
  };
}

/**
 * How far the frame at this position sits from the slot the lattice gives it, as whole pixels.
 *
 * The one place a fractional lattice is brought back to the pixel grid, so the drift a frame is
 * reported at, the move the snap applies and the translation the onion skin stacks by are all this
 * one answer — two of them rounding separately is exactly how those three come to disagree by a
 * pixel.
 *
 * **Truncated toward zero rather than rounded, and that is a correction rather than a taste.** A row
 * whose spacing is 21.5 has frames at 0, 21, 43, 64, 86, and its slots fall at 0, 21.5, 43, 64.5,
 * 86 — so the odd-numbered frames sit half a pixel from theirs, which is as close as a pixel grid
 * allows a frame to get, and every one of them is *already right*. Rounding that half away from zero
 * would report those frames as a pixel out, and a snap at the strictest tolerance would then shuffle
 * an evenly spaced row — the pass making the artwork worse in the name of tidying it. Truncating
 * says what is true: a frame less than a whole pixel from its slot has no move available to it, so
 * its drift is nothing.
 */
export function driftAt(lattice: FrameLattice, index: number, measured: PixelShift): PixelShift {
  return {
    x: whole(measured.x - (lattice.origin.x + index * lattice.pitch.x)),
    y: whole(measured.y - (lattice.origin.y + index * lattice.pitch.y)),
  };
}

/**
 * A distance truncated to the whole pixels a move could actually carry, with no negative zero.
 *
 * `Math.trunc(-0.5)` is `-0`, which is a drift of nothing wearing a sign — it compares equal to
 * zero and prints as one, and then reaches a panel that formats a sign in front of every figure.
 * Folding it back to `0` is what keeps "this frame has not moved" one value rather than two.
 */
function whole(distance: number): number {
  const truncated = Math.trunc(distance);
  return truncated === 0 ? 0 : truncated;
}

/**
 * Siegel's repeated median slope: per frame, the middle of the slopes from it to every other frame,
 * and then the middle of those.
 *
 * Half the frames of a row have to be wrong before the answer moves, which is a stronger guarantee
 * than the row is ever going to need — and, unlike a walk of the neighbouring gaps, every long
 * baseline is in the vote, which is what recovers a spacing that is not a whole number of pixels.
 */
function repeatedMedianSlope(values: readonly number[]): number {
  const slopes = values.flatMap((value, index) => {
    const fromHere = values.flatMap((other, at) => (at === index ? [] : [(other - value) / (at - index)]));
    return fromHere.length === 0 ? [] : [median(fromHere)];
  });
  return slopes.length === 0 ? 0 : median(slopes);
}

/**
 * The middle value, or the mean of the two middle ones.
 *
 * Averaging the middle pair of an even-length list rather than taking one of them, so the answer
 * does not depend on which side of the middle a tie falls — a row laid out alternately 21 and 22
 * pixels apart keeps to 21.5, and either whole number would be a claim the row does not support.
 */
function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}
