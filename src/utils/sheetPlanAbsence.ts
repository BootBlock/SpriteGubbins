import { absentOptionFor } from '../constants/categories/index.ts';
import { sheetPlanFor } from '../constants/sheetPlans/index.ts';
import type { ComponentEntry, ComponentGroup, SheetPlan } from '../types/components.ts';
import type { DirectionalMode } from '../types/output.ts';
import type { DirectionSet } from '../types/rendering.ts';
import type { RigContract } from '../types/rigContract.ts';
import { DECLINABLE_FIELD_KEYS } from '../types/subject.ts';
import type { DeclinableFieldKey, SheetSubject, SubjectCategory } from '../types/subject.ts';
import { rigContractPlan } from './rigContractPlan.ts';

/**
 * The fields of this category whose pool offers a value meaning *the subject has none of this*.
 *
 * Asked of the pools rather than listed per category, because `FieldOption.absentOption` is the
 * declaration and a second list of which categories carry one would be free to fall out of step with
 * it. `DECLINABLE_FIELD_KEYS` is the one list, and `categories.test.ts` holds it to the pools in both
 * directions. Two fields answer today — `clothing` on eight categories and `face_head` on TERRAIN —
 * and a third needs a key there and a declaration in its own pool (issue #293).
 */
export function absentFieldsOf(category: SubjectCategory): readonly DeclinableFieldKey[] {
  return DECLINABLE_FIELD_KEYS.filter((key) => absentOptionFor(category, key) !== null);
}

/**
 * Whether this subject has said it has none of what `key` describes on this category.
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
export function declaresAbsence(category: SubjectCategory, key: DeclinableFieldKey, value: string): boolean {
  const absent = absentOptionFor(category, key);
  if (absent === null) return false;
  return value.trim().toLowerCase() === absent.toLowerCase();
}

/**
 * The plan as this subject actually draws it: the entries a subject declaring an absence has
 * declined, taken out.
 *
 * **This is where a sheet plan meets a fact it is not a function of.** A plan is addressed by
 * category, assembly base, mode, direction set and sheet index, so every entry in it is unconditional
 * — which is right while a pool describes *which kind* of a thing the sheet always draws, and wrong
 * the moment the pool also offers *no thing at all*. Four categories offered exactly that, and the prompt said
 * both halves of it in one document: section 1 stated `Armour & Cladding: Bare Unclad Frame`, section
 * 4 ordered `Cladding panel or fairing ×1`, and section 4's closing rule forbade omitting the entry
 * or merging it into another. The generator could not satisfy both, and whichever way it resolved
 * that, the sheet came back disagreeing with the contract its own prompt stated.
 *
 * **Every declining field at once, and an entry names the one it answers to.** TERRAIN is the category
 * that made that necessary: a reader can decline its *Scatter Layer* and its *Focal Feature*
 * independently, and the blend set's variants and the feature library's focal feature are bound to one
 * field each (issue #293). So the filter asks each entry which attribute it is on the sheet for rather
 * than assuming `clothing`, and a subject declining both gets both drops.
 *
 * **Which entries go is {@link entryDeclinedBy}, and a `'DRAWS_IT_PARTLY'` entry is the one that
 * stays.** It draws the attribute among other things, so dropping it would take an OBJECT's handle
 * and latch with its mounting brackets — which is why a field declaring an `absentOption` may have no
 * `'DRAWS_IT_PARTLY'` entry bound to it, and why VEHICLE's rig fittings and INTERFACE's trim were
 * split into one entry each rather than filtered inside their own text. `sheetPlanAbsence.test.ts`
 * holds that.
 *
 * **A group with nothing left in it goes too.** BACKGROUND's whole *Atmosphere* group is the applied
 * atmosphere and TERRAIN's whole *Repeat-breaking variants* group differs in the scatter, so declining
 * either empties it, and `renderGroup` would otherwise write a heading totalling zero and an intro
 * over no bullets at all. `sheetPlanAbsence.test.ts` holds this half too, over every sheet rather
 * than those two groups.
 *
 * Everything downstream follows without being told, because the count, the inventory prose and the
 * manifest's slot names all walk this one structure: `componentSet.ts` sums it and renders it,
 * `componentSlots.ts` expands it, and {@link planDraws} reads it to decide whether section 1
 * still excepts the `clothing` attribute from its paint rule — which, on a subject that has none, it
 * must not.
 */
export function planAsDrawn(plan: SheetPlan, category: SubjectCategory, subject: SheetSubject): SheetPlan {
  const declined = absentFieldsOf(category).filter((key) => declaresAbsence(category, key, subject[key]));
  if (declined.length === 0) return plan;

  const groups = plan.groups
    .map((group): ComponentGroup => ({
      ...group,
      entries: group.entries.filter((entry) => !entryDeclinedBy(entry, declined)),
    }))
    .filter((group) => group.entries.length > 0);

  return { ...plan, groups };
}

/**
 * Whether this entry is on the sheet **only because the subject has an attribute** it has just
 * declined — the one question {@link planAsDrawn} asks of each line, over the fields `declined`
 * names.
 *
 * Two of `AttributeRole`'s three answers say yes, for two different reasons, and reading them
 * through one predicate is what keeps the filter and the section 1 sentence from being two opinions
 * about the same plan. `'DRAWS_IT'` is the attribute and nothing else, so it goes with it.
 * `'VARIES_IN_IT'` draws none of it and exists to differ in it, so a subject that has none is
 * ordering tiles that must differ in a property it has just denied — and it goes for that reason
 * instead. `'DRAWS_IT_PARTLY'` stays, and a field declaring an `absentOption` may have none bound to
 * it.
 */
export function entryDeclinedBy(entry: ComponentEntry, declined: readonly DeclinableFieldKey[]): boolean {
  const bound = entry.attribute;
  if (bound === undefined || !declined.includes(bound.field)) return false;
  return bound.role === 'DRAWS_IT' || bound.role === 'VARIES_IN_IT';
}

/**
 * Whether this sheet's inventory draws what `key` describes as components of its own.
 *
 * Section 1's paint rule and section 4's inventory have to agree inside one prompt, and which of
 * them is right about the `clothing` line is a fact about the sheet being compiled — see
 * `ComponentEntry.attribute` in `types/components.ts`, which is where each plan states it and
 * why it is stated on the entry rather than on the plan or on the category. `clothing` is the only
 * key anything asks this of, because the rule it answers is section 1's rule about fitted, applied
 * and worn attributes — TERRAIN's focal feature is a piece placed once and no paint rule reaches it.
 *
 * Derived rather than declared a second time: a plan that drops the entry drawing the attribute
 * stops claiming the exception in the same edit, so section 1 cannot come to except something
 * section 4 no longer lists. **Asked of the plan {@link planAsDrawn} returned**, which is what
 * extends that property to a subject declaring none: the entries have gone, so the sentence goes
 * with them rather than excepting an attribute the inventory no longer carries.
 *
 * **`'VARIES_IN_IT'` answers no**, which is the half {@link entryDeclinedBy} deliberately does not
 * share. TERRAIN's blend set loses seven tiles to a reader who declines the scatter and never drew
 * the scatter as pieces of its own, so a plan that carries only those must go on telling the
 * generator that the pebbles and tufts are painted onto the tiles. An exception naming them would
 * order the scatter as loose sprites, which is what `sheetPlans/terrain.ts` argues against at length.
 */
export function planDraws(plan: SheetPlan, key: DeclinableFieldKey): boolean {
  return plan.groups.some((group) =>
    group.entries.some(
      (entry) =>
        entry.attribute?.field === key &&
        (entry.attribute.role === 'DRAWS_IT' || entry.attribute.role === 'DRAWS_IT_PARTLY'),
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
 * when an entry is dropped. They still take the subject, because its assembly base decides which plan
 * they are asking about — a rigid object's views state a component size where the standard views state
 * an assembled one.
 *
 * **A loaded rig contract replaces the rig sheet's entries here**, for the same reason the clothing
 * pass runs here: this is the one place every reader of an inventory comes through, so a contract
 * applied anywhere else would be a second answer to what the sheet draws. It reaches exactly the
 * sheet whose inventory *is* a rig — `posing === 'AT_REST'`, which is what `fixedRigMode` reads to
 * settle the rig mode outright — and on every other sheet a loaded contract passes straight through
 * saying nothing.
 */
export function drawnPlanFor(
  category: SubjectCategory,
  subject: SheetSubject,
  mode: DirectionalMode,
  directions: DirectionSet,
  sheetIndex: number,
  rig: RigContract | null,
): SheetPlan {
  const drawn = planAsDrawn(sheetPlanFor(category, subject, mode, directions, sheetIndex), category, subject);
  return rig === null || drawn.posing !== 'AT_REST' ? drawn : rigContractPlan(drawn, rig);
}
