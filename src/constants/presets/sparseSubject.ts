import { defaultSubjectFor } from '../categories/index.ts';
import { SUBJECT_FIELD_KEYS } from '../../types/subject.ts';
import type { SubjectCategory, SubjectDefinition } from '../../types/subject.ts';

/**
 * A subject with only the named fields set; everything else stays empty and omits its line.
 *
 * What the *technical* preset families need — the ones that fix a rendering contract and leave who
 * the subject is to the reader. A blank field omits its line entirely, and the template states that
 * an absent attribute is the generator's to decide, so these presets ask for exactly the constraints
 * that matter and nothing else.
 *
 * Built by blanking a real `SubjectDefinition` rather than assembling one from `Object.fromEntries`,
 * which would need a cast to claim the result is complete. Here the compiler *checks* it: the
 * starting object is the category's own defaults, so every key is present by construction.
 *
 * Shared rather than copied, because two families now want it — the Unsung Saviour contracts and the
 * art-style references — and a second copy is where one of them quietly stops blanking a field the
 * other does.
 */
export function sparseSubject(
  category: SubjectCategory,
  stated: Partial<SubjectDefinition>,
): SubjectDefinition {
  const blank = defaultSubjectFor(category);
  for (const key of SUBJECT_FIELD_KEYS) blank[key] = '';
  return { ...blank, ...stated };
}
