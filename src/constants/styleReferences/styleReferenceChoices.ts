import { STYLE_REFERENCE_IDS } from '../../types/styleReference.ts';
import type { StyleReferenceId } from '../../types/styleReference.ts';
import type { SubjectCategory } from '../../types/subject.ts';
import { supportsStyleReference } from '../categoryStyleReferences.ts';
import type { OutputChoice } from '../output/choices.ts';
import { STYLE_REFERENCES } from './library.ts';

/** What the `NONE` option is called, since it has no `StyleReference` to carry a label. */
const NONE_LABEL = 'NONE (not matching a published game)';

/**
 * Every reference, with the wording the selector shows.
 *
 * Derived from the map so a reference cannot be added without appearing, and ordered by
 * `STYLE_REFERENCE_IDS`, which keeps the three readings — overhead, side-on, projected —
 * contiguous in the list.
 *
 * Module-private, and offered only through {@link styleReferenceChoices} — the arrangement
 * `projectionChoices`, `directionSetChoices` and `rigModeChoices` all have, and for the same reason.
 * A list exported beside them would be a second, unscoped way to fill this control, and the one a
 * new call site would reach for.
 */
const STYLE_REFERENCE_LABELS: readonly OutputChoice<StyleReferenceId>[] = STYLE_REFERENCE_IDS.map((id) => ({
  value: id,
  label: STYLE_REFERENCES[id]?.label ?? NONE_LABEL,
}));

/**
 * The looks this category's subject can actually be drawn to match.
 *
 * The style-reference half of what `projectionChoices` does for the camera, and it is the same
 * defect seen through the other control: a reference writes a projection, so offering one the
 * subject cannot be drawn under puts a ground measurement in section 2 above a flat front elevation
 * in section 3. `categoryStyleReferences.ts` carries the argument.
 *
 * For nine of the thirteen categories this is the whole library. INTERFACE, PORTRAIT, BACKGROUND and FONT
 * each keep `NONE` and the four references rendered under `ORTHOGRAPHIC_FRONT`.
 */
export function styleReferenceChoices(category: SubjectCategory): readonly OutputChoice<StyleReferenceId>[] {
  return STYLE_REFERENCE_LABELS.filter((choice) => supportsStyleReference(category, choice.value));
}
