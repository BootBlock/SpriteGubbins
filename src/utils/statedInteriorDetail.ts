import { renderingFieldFor } from '../constants/categories/index.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';

/**
 * The interior-detail treatment a subject states, as section 2 reads it (audit finding P11).
 *
 * Section 2's surface-detail level was written for a figure and an object — "major panels and folds",
 * "essential joints only" — and the pixel discipline bans "etched strokes" and "crosshatching" as
 * microtexture. ICON's and FONT's *Interior Detail* states the same thing in the subject's own terms, and
 * `Flat Fill, No Interior Detail` under "seams and material divisions resolved", or `Etched Engraved
 * Lines` under the ban, was one prompt asking for a surface and forbidding it. So where a category
 * declares an `INTERIOR_DETAIL` field and the subject states it, section 2 defers to it and excepts a line
 * technique it names from the ban, by name.
 *
 * `label` is the field's own, so section 2 names it as section 1 does. `lineTechnique` is the stated value
 * where the pool declares it one of its `lineTechniques`, and `null` otherwise — a typed value matches
 * nothing, and the ban stands as written.
 */
export interface StatedInteriorDetail {
  readonly label: string;
  readonly lineTechnique: string | null;
}

/** The treatment this subject states, or `null` where its category declares no such field or it is cleared. */
export function statedInteriorDetail(
  category: SubjectCategory,
  subject: SubjectDefinition,
): StatedInteriorDetail | null {
  const field = renderingFieldFor(category, 'INTERIOR_DETAIL');
  if (field === null) return null;
  const value = subject[field.key].trim();
  if (value === '') return null;
  return { label: field.label, lineTechnique: field.lineTechniques?.includes(value) === true ? value : null };
}
