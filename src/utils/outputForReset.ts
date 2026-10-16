import type { OutputConfig } from '../types/output.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';
import { outputFollowingBase } from './outputFollowingBase.ts';
import { outputForRoster } from './outputForRoster.ts';

/**
 * The output settled against the category's starter subject a reset installs, or `null` where nothing
 * moves.
 *
 * **A reset is a base change and a roster change at once**, so it takes both answers:
 * `outputFollowingBase` for the plans the starter base draws, then `outputForRoster` for the starter
 * roster. The second was missing, and an ICON reset left the sheet index past the starter set's series;
 * the reader's next tick then carried them back to the far sheet they had left.
 */
export function outputForReset(
  category: SubjectCategory,
  before: SubjectDefinition,
  after: SubjectDefinition,
  output: OutputConfig,
): OutputConfig | null {
  const followed = outputFollowingBase(category, before, after, output) ?? output;
  const settled = after.icons === undefined ? followed : outputForRoster(category, before, after, followed);
  return settled === output ? null : settled;
}
