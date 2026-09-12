import type { SheetSubject } from '../types/subject.ts';

/**
 * A subject that draws its category's standard plans, with the `clothing` value a check names.
 *
 * **The assembly base is left empty on purpose.** A base is matched against the values its category
 * declares in `sheetPlans/assemblyBases.ts`, and an empty one matches none, so every category resolves
 * to the plans in `CATEGORY_SHEET_PLANS`. A suite written about those plans states that here rather
 * than borrowing `defaultSubjectFor`, whose OBJECT subject opens on `Single Rigid Object` and draws the
 * rigid object's own sheets instead.
 */
export function standardSubject(clothing = ''): SheetSubject {
  return { anatomy: '', clothing };
}
