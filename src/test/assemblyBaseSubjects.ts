import { CATEGORY_OPTIONS, defaultSubjectFor } from '../constants/categories/index.ts';
import { CATEGORY_ASSEMBLY_BASES, CATEGORY_SHEET_PLANS, plansFor } from '../constants/sheetPlans/index.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';

/**
 * One subject for each plan table a category can be drawn from: the category's default subject with its
 * assembly base set to a pooled value that draws the standard plans, then one per declared base.
 *
 * **What a suite walking "every sheet a category can compile" walks now** (issue #283). A category's
 * sheets used to be a function of its modes alone, so a walk over `modesFor` reached all of them and any
 * subject compiled them. A declared base draws sheets of its own, so a walk has to reach each base with a
 * subject that selects it, and compile with that same subject — a walk listing the standard sheets while
 * compiling `defaultSubjectFor('OBJECT')` would compare a rigid object's prompt against a part library it
 * does not draw.
 *
 * **The rest of the subject is the category's default**, so a suite compiling from these still carries
 * every field section 1 does. The standard base is a real pooled value where the pool offers one rather
 * than an empty field, so section 1 states a base on every sheet it compiles; a pool whose every value is
 * declared would fall back to an empty base, which also draws the standard plans. One subject per table,
 * not per value: values sharing a table compile the same sheets.
 */
export function assemblyBaseSubjectsOf(category: SubjectCategory): readonly SubjectDefinition[] {
  const subject = defaultSubjectFor(category);
  const declared = new Map<unknown, string>();
  for (const [anatomy, plans] of Object.entries(CATEGORY_ASSEMBLY_BASES[category] ?? {})) {
    if (!declared.has(plans)) declared.set(plans, anatomy);
  }

  return [standardSubjectOf(category), ...[...declared.values()].map((anatomy) => ({ ...subject, anatomy }))];
}

/**
 * The category's default subject with its assembly base set to the first pooled value that draws the
 * standard plans — what a check about the standard sheets compiles with.
 *
 * OBJECT is why it exists: its default subject opens on `Single Rigid Object`, which has no rig and no
 * part library, so a check about an articulated OBJECT compiled from the default would be asking the
 * rigid object's sheets. For every other category this is the default subject, whose base already draws
 * the standard plans.
 */
export function standardSubjectOf(category: SubjectCategory): SubjectDefinition {
  const subject = defaultSubjectFor(category);
  if (plansFor(category, subject) === CATEGORY_SHEET_PLANS[category]) return subject;
  const pool = CATEGORY_OPTIONS[category].fields.find((field) => field.key === 'anatomy')?.options ?? [];
  const anatomy =
    pool.find(
      (value) => plansFor(category, { ...subject, anatomy: value }) === CATEGORY_SHEET_PLANS[category],
    ) ?? '';
  return { ...subject, anatomy };
}
