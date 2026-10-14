import type { SheetPlan } from '../types/components.ts';
import type { SheetSubject, SubjectCategory } from '../types/subject.ts';
import { planAsDrawn, planDraws, planDrawsIn } from './sheetPlanAbsence.ts';

/** Which of its three shapes section 1's exception for the `clothing` line takes on one sheet, if any. */
export interface ClothingException {
  readonly clothingIsAComponent: boolean;
  readonly clothingStylesComponents: boolean;
  readonly clothingDrawnElsewhere: boolean;
}

/**
 * Whether section 1 excepts the `clothing` line from its paint rule on this sheet, and in which words —
 * the three facts `SheetFacts` carries under the same names.
 *
 * **Why the rule has exceptions at all.** `clothing` is a different thing in every category — cladding
 * on a vehicle, an overlay style on an icon, trim on an interface — and five of the thirteen draw it as
 * components of their own, so the fixed sentence told the generator the cladding was paint while
 * section 4 listed a cladding panel beside the hull.
 *
 * **A value meaning the subject has none answers *no*, and it does so without a gate here.** The
 * sentence is a statement about section 4, and `plan` is the plan *as this subject draws it* — so a
 * `Bare Unclad Frame` has already taken the cladding panel out of it and there is nothing left for the
 * exception to name. That is the whole of the arrangement: the pool declares the value, `planAsDrawn`
 * drops the entries, and this reads the result rather than re-deciding it. A second test against the
 * value here would be that decision written twice, free to disagree with the inventory the reader is
 * actually shown.
 *
 * **Where a category's pool offers no such value the question does not arise**, which is the answer
 * ICON and INTERFACE take: their sheets draw the attribute, or draw in it, whatever is chosen, so the
 * exception is always right and there is no value that could make it wrong. See `sheetPlans/icon.ts`.
 *
 * Every shape needs the line to have been emitted at all, since an exception naming a line nobody wrote
 * names an absent line in the section that calls itself the authority on the subject.
 */
export function clothingException(
  category: SubjectCategory,
  subject: SheetSubject,
  plan: SheetPlan,
  series: readonly SheetPlan[],
): ClothingException {
  const stated = subject.clothing.trim() !== '';
  return {
    clothingIsAComponent: stated && planDraws(plan, 'clothing'),
    // The style shape: ICON's overlay sheet draws every piece in the *Overlay Style*, so section 1
    // states it as the style of section 4 rather than as a piece of it (audit finding O1).
    clothingStylesComponents: stated && planDrawsIn(plan, 'clothing'),
    // And its shape for a sheet that leaves the attribute to a sibling: ICON's icons are drawn bare and
    // the overlay sheet draws the overlay library in the style, so section 1 telling every icon to carry
    // the *Overlay Style* would be false of every one of them.
    clothingDrawnElsewhere:
      stated &&
      plan.drawnElsewhere === 'clothing' &&
      series.some((sheet) => planDrawsIn(planAsDrawn(sheet, category, subject), 'clothing')),
  };
}
