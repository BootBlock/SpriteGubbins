import { absentOptionFor } from '../constants/categories/index.ts';
import { sheetPlanFor } from '../constants/sheetPlans/index.ts';
import type { ComponentEntry, ComponentGroup, SheetPlan } from '../types/components.ts';
import type { DirectionalMode } from '../types/output.ts';
import type { DirectionSet } from '../types/rendering.ts';
import type { SubjectCategory } from '../types/subject.ts';

/**
 * Whether this subject has said it has none of what its category's `clothing` field describes.
 *
 * The comparison is against the one value that pool declares for it — see `FieldOption.absentOption`
 * — trimmed and case-folded, because the control is an unfiltered combo box and a reader who types
 * `bare unclad frame` has chosen the same thing as a reader who picked it from the list.
 *
 * **It does not try to read an absence out of free text.** `No cladding at all` is a sentence this
 * app cannot tell from `Reactive Armour Blocks` without guessing, and guessing here removes
 * components from a sheet somebody is about to pay a generation for. The pool's own value is the
 * whole of what is recognised, and the field's guidance is where a reader is told so.
 */
export function declaresNoClothing(category: SubjectCategory, clothing: string): boolean {
  const absent = absentOptionFor(category, 'clothing');
  if (absent === null) return false;
  return clothing.trim().toLowerCase() === absent.toLowerCase();
}

/**
 * The plan as this subject actually draws it: the entries a subject declaring none has declined,
 * taken out.
 *
 * **This is where a sheet plan meets the one fact it is not a function of.** A plan is addressed by
 * category, mode, direction set and sheet index, so every entry in it is unconditional — which is
 * right while a pool describes *which kind* of a thing the sheet always draws, and wrong the moment
 * the pool also offers *no thing at all*. Four categories offered exactly that, and the prompt said
 * both halves of it in one document: section 1 stated `Armour & Cladding: Bare Unclad Frame`, section
 * 4 ordered `Cladding panel or fairing ×1`, and section 4's closing rule forbade omitting the entry
 * or merging it into another. The generator could not satisfy both, and whichever way it resolved
 * that, the sheet came back disagreeing with the contract its own prompt stated.
 *
 * **Which entries go is {@link entryNeedsClothing}, and a `'DRAWS_IT_PARTLY'` entry is the one that
 * stays.** It draws the attribute among other things, so dropping it would take an OBJECT's handle
 * and latch with its mounting brackets — which is why a category declaring an `absentOption` for
 * `clothing` may carry none, and why VEHICLE's rig fittings and INTERFACE's trim were split into one
 * entry each rather than filtered inside their own text. `sheetPlanClothing.test.ts` holds that.
 *
 * **A group with nothing left in it goes too.** BACKGROUND's whole *Atmosphere* group is the applied
 * atmosphere and TERRAIN's whole *Repeat-breaking variants* group differs in the scatter, so declining
 * either empties it, and `renderGroup` would otherwise write a heading totalling zero and an intro
 * over no bullets at all. `sheetPlanClothing.test.ts` holds this half too, over every sheet rather
 * than those two groups.
 *
 * Everything downstream follows without being told, because the count, the inventory prose and the
 * manifest's slot names all walk this one structure: `componentSet.ts` sums it and renders it,
 * `componentSlots.ts` expands it, and {@link planDrawsClothing} reads it to decide whether section 1
 * still excepts the attribute from its paint rule — which, on a subject that has none, it must not.
 */
export function planAsDrawn(plan: SheetPlan, category: SubjectCategory, clothing: string): SheetPlan {
  if (!declaresNoClothing(category, clothing)) return plan;

  const groups = plan.groups
    .map((group): ComponentGroup => ({
      ...group,
      entries: group.entries.filter((entry) => !entryNeedsClothing(entry)),
    }))
    .filter((group) => group.entries.length > 0);

  return { ...plan, groups };
}

/**
 * Whether this entry is on the sheet **only because the subject has the attribute** — the one
 * question {@link planAsDrawn} asks of each line.
 *
 * Two of `ClothingRole`'s three answers say yes, for two different reasons, and reading them
 * through one predicate is what keeps the filter and the section 1 sentence from being two opinions
 * about the same plan. `'DRAWS_IT'` is the attribute and nothing else, so it goes with it.
 * `'VARIES_IN_IT'` draws none of it and exists to differ in it, so a subject that has none is
 * ordering tiles that must differ in a property it has just denied — and it goes for that reason
 * instead. `'DRAWS_IT_PARTLY'` stays, and a category declaring an `absentOption` may carry none.
 */
export function entryNeedsClothing(entry: ComponentEntry): boolean {
  return entry.clothingRole === 'DRAWS_IT' || entry.clothingRole === 'VARIES_IN_IT';
}

/**
 * Whether this sheet's inventory draws the subject's `clothing` value as components of its own.
 *
 * Section 1's paint rule and section 4's inventory have to agree inside one prompt, and which of
 * them is right about the `clothing` line is a fact about the sheet being compiled — see
 * `ComponentEntry.clothingRole` in `types/components.ts`, which is where each plan states it and
 * why it is stated on the entry rather than on the plan or on the category.
 *
 * Derived rather than declared a second time: a plan that drops the entry drawing the attribute
 * stops claiming the exception in the same edit, so section 1 cannot come to except something
 * section 4 no longer lists. **Asked of the plan {@link planAsDrawn} returned**, which is what
 * extends that property to a subject declaring none: the entries have gone, so the sentence goes
 * with them rather than excepting an attribute the inventory no longer carries.
 *
 * **`'VARIES_IN_IT'` answers no**, which is the half {@link entryNeedsClothing} deliberately does not
 * share. TERRAIN's blend set loses seven tiles to a reader who declines the scatter and never drew
 * the scatter as pieces of its own, so a plan that carries only those must go on telling the
 * generator that the pebbles and tufts are painted onto the tiles. An exception naming them would
 * order the scatter as loose sprites, which is what `sheetPlans/terrain.ts` argues against at length.
 */
export function planDrawsClothing(plan: SheetPlan): boolean {
  return plan.groups.some((group) =>
    group.entries.some(
      (entry) => entry.clothingRole === 'DRAWS_IT' || entry.clothingRole === 'DRAWS_IT_PARTLY',
    ),
  );
}

/**
 * The sheet this configuration compiles, as this subject draws it — {@link sheetPlanFor} resolved
 * and then put through {@link planAsDrawn}.
 *
 * Every reader of a sheet's *inventory* comes through here rather than composing the two calls for
 * itself: the count, the inventory prose, the manifest's slot names and section 1's exception
 * sentence all have to describe one plan, and a caller that reached for the declared one would put
 * back exactly the disagreement this pair exists to remove.
 *
 * The readers that ask a plan for its `name`, its `facings`, its `assembly` or its `targetQuantity`
 * are deliberately *not* among them, and still call `sheetPlanFor` directly. None of those four moves
 * when an entry is dropped, and three of those callers — `facingApplies`, `sheetDigest` and
 * `statesAssembledSize` — hold no subject at all, so handing them one would be inventing a
 * dependency to satisfy a signature.
 */
export function drawnPlanFor(
  category: SubjectCategory,
  mode: DirectionalMode,
  directions: DirectionSet,
  sheetIndex: number,
  clothing: string,
): SheetPlan {
  return planAsDrawn(sheetPlanFor(category, mode, directions, sheetIndex), category, clothing);
}
