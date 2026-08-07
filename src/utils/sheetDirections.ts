import { DIRECTION_COVERAGE, DIRECTION_LISTS } from '../constants/promptText/index.ts';
import type { OutputConfig } from '../types/output.ts';
import type { Direction } from '../types/rendering.ts';

/**
 * Which facings a sheet actually covers, and which of them it assembles towards.
 *
 * Not simply the set the user chose. Each mode's inventory and component count are written for a
 * particular number of directions, so a fifteen-piece cut-out sheet cannot also demand all eight
 * compass points — for those modes the set is a *run list*, one sheet per facing, and
 * `primaryDirection` says which run this is.
 *
 * Extracted from the compiler because the splitter needs the same answer: it labels each run with
 * the facing that run covers, and a second implementation of this would eventually disagree with
 * the prompt it is labelling. One resolution, two readers.
 */
export interface SheetDirections {
  /** Every facing this one sheet draws, in the order the prompt lists them. */
  readonly covered: readonly [Direction, ...Direction[]];
  /** The facing the components assemble towards, which fixes the depth order. */
  readonly assembly: Direction;
}

export function sheetDirections(output: OutputConfig): SheetDirections {
  const facings = DIRECTION_LISTS[output.directions];
  const [firstFacing] = facings;

  // Resolved *through* the set rather than trusted. A facing the set does not contain — a stale
  // `north` left behind by a switch to `THREE_CLASSIC` — would otherwise reach the prompt's
  // assembly direction and depth order while its "directions required" line never mentioned it.
  const primary = facings.find((facing) => facing === output.primaryDirection) ?? firstFacing;

  const coverage = DIRECTION_COVERAGE[output.directionalMode];
  const covered: readonly [Direction, ...Direction[]] =
    coverage === 'primary' ? [primary] : DIRECTION_LISTS[coverage];
  const [assembly] = covered;

  return { covered, assembly };
}
