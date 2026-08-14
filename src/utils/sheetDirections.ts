import { resolveDirectionSet } from '../constants/categoryDirectionSets.ts';
import { DIRECTION_LISTS } from '../constants/promptText/index.ts';
import { resolveMode, sheetPlanFor } from '../constants/sheetPlans/index.ts';
import type { SheetPlan } from '../types/components.ts';
import type { OutputConfig } from '../types/output.ts';
import type { Direction } from '../types/rendering.ts';
import type { SubjectCategory } from '../types/subject.ts';

/**
 * Which facings a sheet actually covers, and which of them it assembles towards.
 *
 * The plan itself is the authority now: a multi-view sheet carries the facing tuple its series
 * builder wrote from the chosen direction set, and a `'run'` sheet covers the one facing
 * `primaryDirection` picks out of that set. This module resolves the second kind — the first is
 * read straight off the plan — and answers for both through one function, because the splitter
 * labels its runs from the same answer and two implementations of it would eventually disagree
 * about the prompt one of them is describing. One resolution, two readers.
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
 * A facing tuple is already the whole answer: the series builder wrote it from the set the category
 * resolved, so the sheet covers exactly those views and assembles towards the first of them. A
 * `'run'` sheet narrows the chosen set to the one facing this run is for — {@link primaryFacing}
 * resolves it through the set rather than trusting the stored value, because a stale `north` left
 * behind by a switch to `THREE_CLASSIC` is a facing that set never turns to.
 */
export function sheetDirections(
  category: SubjectCategory,
  output: OutputConfig,
  plan: SheetPlan,
): SheetDirections {
  if (plan.facings !== 'run') {
    const [assembly] = plan.facings;
    return { covered: plan.facings, assembly };
  }

  const primary = primaryFacing(category, output);
  return { covered: [primary], assembly: primary };
}

/**
 * The facing a run sheet's `primaryDirection` names, resolved through the set it belongs to.
 *
 * Its own function because three callers need exactly this and only one of them can name a sheet
 * plan: the compiler resolves a whole sheet's coverage, the studio's facing control shows the
 * value it is about to offer choices from, and the collapsed projection digest reports it. A
 * digest that had to invent a `SheetPlan` to ask which facing was selected would be answering a
 * question about the whole sheet in order to report one control.
 *
 * **Two resolutions, in that order, and both are needed.** The set is resolved through the
 * *category* first, because which sets mean anything is a property of the subject:
 * `CATEGORY_DIRECTION_SETS` narrows a stored `THREE_CLASSIC` to `SINGLE_FRONT` on an interface
 * widget or a ground tile, neither of which has a front to turn away from. The facing is then
 * resolved through *that* set rather than the stored one — doing only the second accepts a
 * `front-three-quarter` that is perfectly valid against `THREE_CLASSIC` and still a yaw the subject
 * does not have.
 */
export function primaryFacing(category: SubjectCategory, output: OutputConfig): Direction {
  const facings = DIRECTION_LISTS[resolveDirectionSet(category, output.directions)];
  const [firstFacing] = facings;
  return facings.find((facing) => facing === output.primaryDirection) ?? firstFacing;
}

/**
 * Whether the sheet the studio is composing reads `primaryDirection` at all.
 *
 * Only a `'run'` sheet does — a multi-view sheet draws the facings its plan names and the control
 * would promise something the prompt does not carry. Asked of the *resolved* sheet, so a stored
 * mode or index the category cannot produce answers for the sheet actually being compiled. The
 * studio uses it to show the facing control, and only where the resolved set names more than one
 * facing — a run list of one has nothing to choose.
 */
export function facingApplies(category: SubjectCategory, output: OutputConfig): boolean {
  const mode = resolveMode(category, output.directionalMode);
  const plan = sheetPlanFor(category, mode, output.directions, output.sheetIndex);
  return (
    plan.facings === 'run' && DIRECTION_LISTS[resolveDirectionSet(category, output.directions)].length > 1
  );
}
