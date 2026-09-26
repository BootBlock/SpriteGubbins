import { FRAME_DRIFT_SEARCH, FRAME_SWEEP_BUDGET } from '../constants/quantiser.ts';
import type { CoverageMask } from '../types/quantiser.ts';

/**
 * How far either side of its seed every frame on this sheet may be searched, in drawn pixels.
 *
 * Each frame after the first in its strip is registered against the first, and every one of the
 * `(2 × reach + 1)²` candidates reads at most that frame's `height × stride` mask words — so the
 * whole pass costs that many candidates times the frames' combined words, and
 * {@link FRAME_SWEEP_BUDGET} is the ceiling that product may not cross. Divided out, square-rooted
 * and floored to a reach, never past {@link FRAME_DRIFT_SEARCH} and never below zero: a sheet whose
 * frames cannot afford even the nine candidates a reach of one costs is read at its corner
 * differences alone. A word is paid for every row of a frame however few of its 32 pixels the frame
 * fills, so many narrow frames arrive there sooner than a few wide ones.
 *
 * **One reach for the whole sheet rather than one per frame**, for the reason `affordableReach`
 * gives the symmetry pass: the budget is a statement about the pass, and bounded per frame a sheet
 * of two hundred frames would spend two hundred times it. The first frame of each strip is the
 * reference and is never searched, so its words are not counted.
 *
 * Pure.
 */
export function affordableDriftReach(strips: readonly (readonly CoverageMask[])[]): number {
  const words = strips.reduce(
    (total, strip) => strip.slice(1).reduce((sum, frame) => sum + frame.height * frame.stride, total),
    0,
  );
  if (words === 0) return FRAME_DRIFT_SEARCH;
  const side = Math.floor(Math.sqrt(Math.floor(FRAME_SWEEP_BUDGET / words)));
  return Math.max(0, Math.min(FRAME_DRIFT_SEARCH, Math.floor((side - 1) / 2)));
}
