import { FRAME_DRIFT_SEARCH, FRAME_SWEEP_BUDGET } from '../constants/quantiser.ts';
import type { CoverageMask } from '../types/quantiser.ts';
import { registrationWords } from './registrationWords.ts';

/**
 * How far either side of its seed every frame on this sheet may be searched, in drawn pixels.
 *
 * Each frame after the first in its strip is registered against the first, and
 * {@link registrationWords} states the most mask words one of those registrations touches at a given
 * reach. The widest reach, from {@link FRAME_DRIFT_SEARCH} down, whose total across the sheet stays
 * within {@link FRAME_SWEEP_BUDGET} is the answer, and zero where none does: a sheet whose frames
 * cannot afford even the nine candidates a reach of one costs is read at its corner differences
 * alone. A word is paid for every row of a frame however few of its 32 pixels the frame fills, so
 * many narrow frames arrive there sooner than a few wide ones.
 *
 * **One reach for the whole sheet rather than one per frame**, for the reason `affordableReach`
 * gives the symmetry pass: the budget is a statement about the pass, and bounded per frame a sheet
 * of two hundred frames would spend two hundred times it. The first frame of each strip is the
 * reference and is never searched, so it is paid for only as what each frame is laid against.
 *
 * Pure.
 */
export function affordableDriftReach(strips: readonly (readonly CoverageMask[])[]): number {
  for (let reach = FRAME_DRIFT_SEARCH; reach > 0; reach -= 1) {
    if (sweepWords(strips, reach) <= FRAME_SWEEP_BUDGET) return reach;
  }
  return 0;
}

/** What registering every frame on the sheet at this reach touches, in mask words. */
function sweepWords(strips: readonly (readonly CoverageMask[])[], reach: number): number {
  let total = 0;
  for (const [reference, ...frames] of strips) {
    if (reference === undefined) continue;
    for (const frame of frames) total += registrationWords(reference, frame, reach);
  }
  return total;
}
