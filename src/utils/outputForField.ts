import type { OutputConfig } from '../types/output.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';
import { outputFollowingBase } from './outputFollowingBase.ts';
import { outputForRoster } from './outputForRoster.ts';

/**
 * The output an edit to one subject field leaves behind, or `null` where it moves nothing.
 *
 * Two edits move it. A new assembly base draws other plans, which can settle the mode, the rig and the
 * sheet index (`outputFollowingBase`). And on an icon set the *Extra Overlay Pieces* decide how many
 * overlay sheets close the series, so an edit that adds or removes one keeps the reader on the sheet
 * they were on, by the rule a roster change takes (`outputForRoster`) — without it, removing the pieces
 * that filled a second overlay sheet left the index past the series, and the studio showed the first
 * icon sheet. Asked of `useSubjectStore`'s `setField`, which records an act only where this answers.
 */
export function outputForField(
  category: SubjectCategory,
  before: SubjectDefinition,
  after: SubjectDefinition,
  output: OutputConfig,
): OutputConfig | null {
  const followed = outputFollowingBase(category, before, after, output);
  if (after.icons === undefined) return followed;
  const settled = outputForRoster(category, before, after, followed ?? output);
  return settled === output ? null : settled;
}
