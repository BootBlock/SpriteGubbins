import { absentOptionFor } from '../constants/categories/index.ts';
import { DECLINABLE_FIELD_KEYS } from '../types/subject.ts';
import type { DeclinableFieldKey, SheetSubject, SubjectCategory } from '../types/subject.ts';

/**
 * A subject that draws its category's standard plans, declining nothing.
 *
 * **The assembly base is left empty on purpose.** A base is matched against the values its category
 * declares in `sheetPlans/assemblyBases.ts`, and an empty one matches none, so every category resolves
 * to the plans in `CATEGORY_SHEET_PLANS`. A suite written about those plans states that here rather
 * than borrowing `defaultSubjectFor`, whose OBJECT subject opens on `Single Rigid Object` and draws the
 * rigid object's own sheets instead.
 *
 * **Every declinable field is empty for the same reason.** An empty value matches no `absentOption`,
 * so a plan keeps every entry it declares — which is the corpus a suite about the declared plans is
 * asking for. A check about what a reader who declines gets goes through {@link decliningSubject},
 * which takes the value from the pool rather than spelling it out.
 */
export function standardSubject(): SheetSubject {
  return { anatomy: '', clothing: '', face_head: '' };
}

/**
 * `subject` with exactly the named fields declined — each set to the value its own pool declares as
 * its `absentOption`, and every other field left as it was.
 *
 * **The category decides the words**, which is why this takes one rather than a string per field: the
 * value meaning *there is none* is `Bare Unclad Frame` on a vehicle, `NONE` on an item and
 * `No Focal Feature` on TERRAIN's *Focal Feature*, and a suite spelling one out would be that string
 * written somewhere other than the pool that offers it. A named field the category declares nothing
 * for comes back empty, which declines nothing, so a sweep may name every key and get the drops that
 * exist.
 *
 * **It takes a subject rather than building one, and that is the whole of the second parameter's
 * job.** A helper returning a fresh record has to invent a value for every field it is not declining,
 * and a caller spreading that over its own subject then silently blanks them — which is what the
 * count-and-name sweep did to CHARACTER's *Face / Head* before this took a base. Handing it the
 * subject under test keeps the corpus the sweep meant to compile.
 *
 * **One field at a time is the usual call**, because the declinable fields are independent choices and
 * a failure has to say which one took a piece away. {@link decliningEverything} is the one case that
 * wants them all.
 */
export function decliningSubject(
  subject: SheetSubject,
  category: SubjectCategory,
  ...declined: readonly DeclinableFieldKey[]
): SheetSubject {
  const valueFor = (key: DeclinableFieldKey): string =>
    declined.includes(key) ? (absentOptionFor(category, key) ?? '') : subject[key];

  // Written out key by key rather than folded over `DECLINABLE_FIELD_KEYS`, so that a fourth key is a
  // compiler error here instead of a field this silently leaves at its declared value.
  return { anatomy: subject.anatomy, clothing: valueFor('clothing'), face_head: valueFor('face_head') };
}

/**
 * `subject` with every absence its category offers declined — the leanest sheet any reader receives.
 *
 * Section 0's scale example and section 2's unit have to be true of it, because five of the nine pools
 * that declare an absence declare their own *first* option: a reader who touches nothing gets a
 * BACKGROUND layer library with no atmosphere veil and a TERRAIN blend set with no focal feature, so
 * the declared plan is a sheet nobody is handed.
 */
export function decliningEverything(subject: SheetSubject, category: SubjectCategory): SheetSubject {
  return decliningSubject(subject, category, ...DECLINABLE_FIELD_KEYS);
}
