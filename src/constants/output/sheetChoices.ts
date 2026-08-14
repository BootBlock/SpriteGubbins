import { sheetSeriesFor } from '../sheetPlans/index.ts';
import { planComponentCount } from '../../utils/componentSet.ts';
import type { DirectionalMode } from '../../types/output.ts';
import type { DirectionSet } from '../../types/rendering.ts';
import type { SubjectCategory } from '../../types/subject.ts';
import type { OutputChoice } from './choices.ts';

/**
 * Which sheet of a pairing's series the studio is composing, one option per sheet.
 *
 * **The preview compiles one sheet, so something has to say which** — and until a pairing could be
 * more than one, that question had no answer to give. Two things make it load-bearing rather than
 * decorative: a history entry restores the sheet it was copied from, so the studio can open on the
 * second one; and the split drawer's rows are copied individually, so a user working through a
 * batch expects the panel behind it to follow. Without the control, a character's thirty-four limb
 * variants would appear under a preview indistinguishable from its fifteen-component core.
 *
 * The count is the *plan's* alone — no additional anatomy — because this list is read while choosing
 * between sheets of one series rather than between pairings: the numbers are here to tell the
 * entries apart, and the plan's own size is the half that differs by design. The anatomy's
 * contribution varies with the subject and lands on every sheet that draws the body
 * (`anatomyFacingsFor`), so folding it in would move most of the figures without separating any.
 *
 * Numbered from one, because it is a position in a sequence the user works through, and the zero it
 * is built from is an array index nobody outside the code has to know about.
 */
export function sheetChoices(
  category: SubjectCategory,
  mode: DirectionalMode,
  directions: DirectionSet,
): readonly OutputChoice<number>[] {
  return sheetSeriesFor(category, mode, directions).map((plan, index) => ({
    value: index,
    label: `${String(index + 1)}. ${plan.name} (${String(planComponentCount(plan))})`,
  }));
}
