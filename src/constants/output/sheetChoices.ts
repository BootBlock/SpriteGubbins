import { sheetSeriesFor } from '../sheetPlans/index.ts';
import { planComponentCount } from '../../utils/componentSet.ts';
import { planAsDrawn } from '../../utils/sheetPlanClothing.ts';
import type { DirectionalMode } from '../../types/output.ts';
import type { DirectionSet } from '../../types/rendering.ts';
import type { SubjectCategory } from '../../types/subject.ts';
import type { OutputChoice } from './choices.ts';

/**
 * Which part of a pairing's inventory the studio is composing, one option per part.
 *
 * **The preview compiles one sheet, so something has to say which** — and until a pairing could be
 * more than one, that question had no answer to give. Two things make it load-bearing rather than
 * decorative: a history entry restores the sheet it was copied from, so the studio can open on the
 * second one; and the split drawer's rows are copied individually, so a user working through a
 * batch expects the panel behind it to follow. Without the control, a character's thirty-four limb
 * variants would appear under a preview indistinguishable from its fifteen-component core.
 *
 * The count is the *plan's* alone — no additional anatomy — because this list is read while choosing
 * between parts of one inventory rather than between pairings: the numbers are here to tell the
 * entries apart, and the plan's own size is the half that differs by design. The anatomy's
 * contribution varies with the subject and lands on every sheet that draws the body
 * (`anatomyFacingsFor`), so folding it in would move most of the figures without separating any.
 *
 * **Deliberately unnumbered, and it used to carry `1.`, `2.`, `3.`** — which read as a position in
 * the batch, because that is the only numbered sequence of sheets anything else in the app counts.
 * It is not one: this axis is the *inventory*, and every `'run'` part of it is generated once per
 * facing, so the batch is this list with those parts multiplied out. A reader who set this control
 * to a character's second entry and then read `Sheet 2 of 6` beside the prompt had two ordinals
 * agreeing by coincidence — the run parts happen to come last in every series — and concluded the
 * six were six of the part they had just chosen. Five of them are, at five different facings, and
 * the first is the trunk they hang on. `SheetProgress` counts the batch and says so; this list does
 * not compete with it.
 */
export function sheetChoices(
  category: SubjectCategory,
  mode: DirectionalMode,
  directions: DirectionSet,
  clothing: string,
): readonly OutputChoice<number>[] {
  // Each plan **as this subject draws it**, so the figure in the menu is the figure the prompt for
  // that sheet contracts for. A reader who has said their vehicle carries no cladding is choosing
  // between inventories that no longer hold a cladding panel, and a label counting one would be the
  // studio advertising a component the prompt does not ask for — see `sheetPlanClothing.ts`.
  return sheetSeriesFor(category, mode, directions).map((plan, index) => ({
    value: index,
    label: `${plan.name} (${String(planComponentCount(planAsDrawn(plan, category, clothing)))})`,
  }));
}
