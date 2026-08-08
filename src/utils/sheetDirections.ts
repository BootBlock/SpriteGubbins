import { DIRECTION_COVERAGE, DIRECTION_LISTS } from '../constants/promptText/index.ts';
import type { OutputConfig } from '../types/output.ts';
import type { Direction, DirectionSet } from '../types/rendering.ts';

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

/**
 * Whether the chosen direction set reaches the sheet at all.
 *
 * `false` for the modes that name their own facings — `CORE_DIRECTIONAL_VARIANTS` draws the three
 * classic yaws whatever the control is set to, because its inventory names them entry by entry. The
 * studio has to know, because that mode is the default for five of the six categories *and* the
 * default in `DEFAULT_OUTPUT_CONFIG`: without this the app opens showing a live four-choice select
 * whose value the compiler discards, and a user who picks all eight compass points gets a
 * three-facing sheet with nothing anywhere saying why.
 */
export function directionSetApplies(output: OutputConfig): boolean {
  return DIRECTION_COVERAGE[output.directionalMode] === 'primary';
}

/**
 * The direction set the sheet is actually drawn to.
 *
 * The chosen one only where the mode defers to it; otherwise the mode's own. Distinct from
 * {@link sheetDirections}, which resolves all the way down to the individual facings — a digest
 * wants the set's *name*, and reading `output.directions` for it is what made the collapsed
 * projection summary report `EIGHT_COMPASS` on a sheet covering three.
 */
export function effectiveDirectionSet(output: OutputConfig): DirectionSet {
  const coverage = DIRECTION_COVERAGE[output.directionalMode];
  return coverage === 'primary' ? output.directions : coverage;
}
