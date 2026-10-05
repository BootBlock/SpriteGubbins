import { defaultSubjectFor } from '../constants/categories/index.ts';
import type { SubjectDefinition } from '../types/subject.ts';

/**
 * ICON's default subject with its roster turned to a tint mask — the one subject that withdraws the
 * `PURE_WHITE` key and every pinned palette (audit finding M1), so the suite that checks a reader
 * resolves both through the subject has a subject to resolve them against.
 */
export function tintMaskedIconSubject(): SubjectDefinition {
  const subject = defaultSubjectFor('ICON');
  if (subject.icons === undefined) throw new Error('ICON should open with a roster');
  return { ...subject, icons: { ...subject.icons, colourMode: 'TINT_MASK' } };
}
