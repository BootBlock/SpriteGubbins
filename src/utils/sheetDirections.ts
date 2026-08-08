import { DIRECTION_COVERAGE, DIRECTION_LISTS } from '../constants/promptText/index.ts';
import type { SheetPlan } from '../types/components.ts';
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

/**
 * The facings one sheet of the series draws.
 *
 * **Two questions, asked at two levels, and conflating them is what this signature exists to stop.**
 * The *mode* decides which direction set reaches the sheet at all: `'primary'` defers to the user's
 * choice and treats it as a run list, and a named set is the mode's own, drawn whatever the control
 * says. The *plan* then decides how much of that set this particular sheet carries — the directional
 * core draws every facing of it, and the articulation sheet that shares its mode draws one.
 *
 * A plan's `facings` is only consulted on the mode's own set, because a run list has already
 * narrowed to a single facing by the time it gets here: an `'every'` sheet under `'primary'` would
 * be asking for the whole run list on one image, which is the 120-piece sheet the splitter exists to
 * prevent. `sheetPlans.test.ts` pins that no such pairing is declared.
 */
export function sheetDirections(output: OutputConfig, plan: SheetPlan): SheetDirections {
  const coverage = DIRECTION_COVERAGE[output.directionalMode];

  if (coverage !== 'primary') {
    const setFacings = DIRECTION_LISTS[coverage];
    const [firstOfSet] = setFacings;
    // The mode's own set, so `primaryDirection` is not consulted at either width — a sheet drawn to
    // one facing of a set the user never chose takes the facing the rest of the series assembles
    // towards, not a leftover from some other set the control was last left on.
    const covered: readonly [Direction, ...Direction[]] =
      plan.facings === 'every' ? setFacings : [firstOfSet];
    const [assembly] = covered;
    return { covered, assembly };
  }

  const primary = primaryFacing(output);
  return { covered: [primary], assembly: primary };
}

/**
 * The facing a run list's `primaryDirection` names, resolved through the set it belongs to.
 *
 * Its own function because three callers need exactly this and only one of them can name a sheet
 * plan: the compiler resolves a whole sheet's coverage, the studio's facing control shows the
 * value it is about to offer choices from, and the collapsed projection digest reports it. A
 * digest that had to invent a `SheetPlan` to ask which facing was selected would be reaching for
 * the category, which it does not have and does not need.
 *
 * Resolved *through* the set rather than trusted. A facing the set does not contain — a stale
 * `north` left behind by a switch to `THREE_CLASSIC` — would otherwise reach the prompt's assembly
 * direction and depth order while its "directions required" line never mentioned it.
 */
export function primaryFacing(output: OutputConfig): Direction {
  const facings = DIRECTION_LISTS[output.directions];
  const [firstFacing] = facings;
  return facings.find((facing) => facing === output.primaryDirection) ?? firstFacing;
}

/**
 * Whether the chosen direction set reaches the sheet at all.
 *
 * `false` for the modes that name their own facings — `CORE_DIRECTIONAL_VARIANTS` draws the three
 * classic yaws whatever the control is set to, because its inventory names them entry by entry. The
 * studio has to know, because that mode is the default for five of the eight categories *and* the
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
