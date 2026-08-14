import { modesFor } from '../sheetPlans/index.ts';
import { seriesComponentCount, sheetCountFor } from '../../utils/componentSet.ts';
import type { AnatomyComponent } from '../../types/anatomy.ts';
import type { DirectionalMode } from '../../types/output.ts';
import type { DirectionSet } from '../../types/rendering.ts';
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
 * `seriesComponentCount` rather than summing anything itself, so this really is another *reader* of
 * the one total rather than a second implementation — a label that disagrees with the prompt is how
 * a user comes to expect the wrong number of components.
 *
 * **The figure is the whole series, and it says so when that is more than one sheet.** This label is
 * how a user chooses what to generate, so the number they are choosing by has to be what the pairing
 * costs them — a CHARACTER's five-view core reading "15 components" beside a rig reading "15" would
 * have the two looking like the same size of job when one of them is two generations of forty-nine
 * components. The per-sheet figure is what the budget notice, the inventory heading and the atlas
 * grid state, because each of those describes one image.
 */
export function directionalModeChoices(
  category: SubjectCategory,
  directions: DirectionSet,
  additional: readonly AnatomyComponent[],
): readonly OutputChoice<DirectionalMode>[] {
  return modesFor(category).map((mode) => {
    const sheets = sheetCountFor(category, mode, directions);
    const total = String(seriesComponentCount(category, mode, directions, additional));
    // The unit gives way to the sheet count rather than joining it: `CORE_DIRECTIONAL_VARIANTS`
    // leaves 22 characters inside its parenthesis against this file's 50-character budget, and a
    // four-digit total with both spelled out is 31. Which one to drop is not a close call — that a
    // pairing is two generations is the fact a user is choosing by, and that the figures count
    // components is what every other number in the panel already means.
    const detail =
      sheets > 1 ? `across ${String(sheets)} sheets` : mode === 'TILESET_MODULAR' ? 'tiles' : 'components';
    return { value: mode, label: `${mode} (${total} ${detail})` };
  });
}
