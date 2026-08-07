import { modesFor } from '../sheetPlans/index.ts';
import { componentCountFor } from '../../utils/componentSet.ts';
import type { AnatomyComponent } from '../../types/anatomy.ts';
import type { DirectionalMode } from '../../types/output.ts';
import type { SubjectCategory } from '../../types/subject.ts';
import type { OutputChoice } from './choices.ts';

/**
 * How each mode is labelled for a category, with the count that pairing would actually ask for.
 *
 * **Scoped to the category**, which is the studio half of the contamination fix: the selector used
 * to offer all four modes to everything, so `TILESET_MODULAR` was one click away from any character
 * and the sheet it produced was floors and walls. A mode the category has no plan for is not
 * rendered, so the mismatch cannot be selected in the first place.
 *
 * A function rather than a constant because the count is a property of neither axis alone: the
 * category and mode choose the plan, and a subject naming additional anatomy adds to it. It calls
 * `componentCountFor` rather than summing anything itself, so this really is another *reader* of the
 * one total rather than a second implementation — a label that disagrees with the prompt is how a
 * user comes to expect the wrong number of components.
 */
export function directionalModeChoices(
  category: SubjectCategory,
  additional: readonly AnatomyComponent[],
): readonly OutputChoice<DirectionalMode>[] {
  return modesFor(category).map((mode) => ({
    value: mode,
    label: `${mode} (${String(componentCountFor(category, mode, additional))} ${
      mode === 'TILESET_MODULAR' ? 'tiles' : 'components'
    })`,
  }));
}
