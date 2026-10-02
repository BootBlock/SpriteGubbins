import { plansFor } from '../constants/sheetPlans/index.ts';
import type { OutputConfig } from '../types/output.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';
import { resolveOutputForSubject } from './resolveOutputForSubject.ts';

/**
 * The output settled against a subject whose assembly base may have changed, or `null` where nothing
 * moves.
 *
 * **Only where the change reaches the plans.** A base chooses which sheets its category draws (issue
 * #283), so a reader who picks `Single Rigid Object` has left behind a cut-out rig sheet that nothing
 * on the object could turn on, and the store would otherwise hold a mode the studio no longer offers.
 * Where the plans are one table before and after, nothing moves — which is what keeps a reader's sheet
 * index while they type, since the combo box writes every keystroke through `useSubjectStore.setField`.
 *
 * Pure, and handed the output rather than reading a store, so the store that writes the answer is the
 * only one that touches state.
 */
export function outputFollowingBase(
  category: SubjectCategory,
  before: SubjectDefinition,
  after: SubjectDefinition,
  output: OutputConfig,
): OutputConfig | null {
  if (plansFor(category, before) === plansFor(category, after)) return null;
  // The plans differ, so a contract loaded for the body before the edit does not survive it: it
  // replaces an inventory the new base no longer draws (issue #286).
  const resolved = resolveOutputForSubject(category, after, output, { category, subject: before });
  return resolved === output ? null : resolved;
}
