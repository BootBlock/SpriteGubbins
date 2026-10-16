import type { PixelShift } from '../types/quantiser.ts';
import { median } from './median.ts';
import { repeatedMedianSlope } from './repeatedMedianSlope.ts';

/** The regular layout a strip's frames were fitted to: where it starts, and how far apart it steps. */
export interface FrameLattice {
  /** Where slot zero sits, relative to frame zero's own measured position — fractional on both axes. */
  readonly origin: PixelShift;
  /**
   * How far each slot steps along the row from the one before it, in drawn pixels — fractional,
   * deliberately. There is no step down the row: a row shares one baseline, see {@link fitLattice}.
   */
  readonly pitch: number;
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
 * **A frame's slot is decided by where it is, never by where it comes in the list.** A row with one
 * empty slot, or one stray piece in it, is a row whose list positions no longer count its slots:
 * frames at 0, 32, 64, 128 and 160 fill six slots of 32 with the fourth left empty, and numbering
 * them 0 to 4 fits a pitch of 40 and then moves three correct frames to re-space the row at it. So each frame
 * is numbered by {@link slotOf}, the slot nearest to it, and two pieces may share one. The numbering
 * and the fit need each other, so the first numbering walks the row — each gap counts as however
 * many steps of the row's typical gap it spans — and that numbering is fitted, renumbered against
 * the fit, and fitted again until no frame changes slot. Walking the gaps rather than dividing each
 * position by the typical gap is what keeps a long row whose spacing is fractional from losing count
 * at its far end. The typical gap is the *lower* median, because an empty slot can only lengthen a
 * gap: a row of three at 0, 32 and 96 is two steps of 32, not two of 48.
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
 * position has left over once its slot's share of that spacing is taken off. Without the second, the
 * lattice would be pinned to frame zero — and a strip whose first frame is the drifting one would
 * report every other frame as wrong.
 *
 * **Down the row there is no spacing to fit, only a baseline**: the median of the frames' heights.
 * A row is a band, so its frames are laid out level, and a slope fitted to their heights would read
 * a row whose frames creep steadily lower as the layout — and blame the one level frame for not
 * sagging with them.
 *
 * **The pitch stays fractional**, per the worked figure above. {@link driftAt} is where the rounding
 * belongs, once, at the point a slot has to name a pixel.
 *
 * Pure, and quadratic in a frame count `SCATTERED_SPRITE_CEILING` already bounds, once per fit. The
 * refits stop at the first numbering the fit leaves unchanged, and at one per frame whatever happens,
 * so a numbering that alternates between two readings cannot hold the pass. `shifts` must hold at
 * least two entries, which `SMALLEST_STRIP_FRAMES` guarantees at the one call site; an empty list is
 * not a strip and has no layout to fit.
 */
export function fitLattice(shifts: readonly PixelShift[]): FrameLattice {
  let slots = walkedSlots(shifts.map((shift) => shift.x));
  let lattice = fitTo(shifts, slots);
  for (let refit = 0; refit < shifts.length; refit += 1) {
    const nearest = shifts.map((shift) => slotOf(lattice, shift.x));
    if (nearest.every((slot, index) => slot === slots[index])) break;
    slots = nearest;
    lattice = fitTo(shifts, slots);
  }
  return lattice;
}

/**
 * The slot nearest to a frame at this horizontal position, which is the one it is fitted and judged
 * against. A lattice with no spacing — every frame stacked at one place — has only the one slot.
 */
export function slotOf(lattice: FrameLattice, x: number): number {
  return lattice.pitch > 0 ? Math.round((x - lattice.origin.x) / lattice.pitch) : 0;
}

/**
 * How far the frame at this position sits from the nearest slot the lattice has, as whole pixels.
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
export function driftAt(lattice: FrameLattice, measured: PixelShift): PixelShift {
  return {
    x: whole(measured.x - (lattice.origin.x + slotOf(lattice, measured.x) * lattice.pitch)),
    y: whole(measured.y - lattice.origin.y),
  };
}

/** The two medians, over frames already numbered by their slots. */
function fitTo(shifts: readonly PixelShift[], slots: readonly number[]): FrameLattice {
  const pitch = repeatedMedianSlope(shifts.map((shift, index) => [slots[index] ?? 0, shift.x] as const));
  return {
    pitch,
    origin: {
      x: median(shifts.map((shift, index) => shift.x - (slots[index] ?? 0) * pitch)),
      y: median(shifts.map((shift) => shift.y)),
    },
  };
}

/**
 * A first numbering of the slots, read off the gaps: each gap advances the count by however many
 * steps of the row's typical gap it spans, which is none for a stray piece crowded against a frame.
 * A row with no gap that steps forward at all is one slot.
 */
function walkedSlots(positions: readonly number[]): readonly number[] {
  const gaps = positions.slice(1).map((position, index) => position - (positions[index] ?? 0));
  const forward = gaps.filter((gap) => gap > 0).sort((left, right) => left - right);
  const step = forward[Math.floor((forward.length - 1) / 2)];
  const slots = [0];
  for (const gap of gaps) {
    const previous = slots[slots.length - 1] ?? 0;
    slots.push(step === undefined ? previous : previous + Math.max(0, Math.round(gap / step)));
  }
  return slots;
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
