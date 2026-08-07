import { componentCountFor } from '../../utils/componentSet.ts';
import type { AnatomyComponent } from '../../types/anatomy.ts';
import type { DirectionalMode } from '../../types/output.ts';
import type { OutputChoice } from './choices.ts';

/**
 * The sheet-contents choices, labelled with the count each mode would actually ask for.
 *
 * A function rather than a constant because the count is no longer a property of the mode alone: a
 * subject naming additional anatomy adds to every one of them. The number is stated in five places —
 * here, the prompt's contract, its inventory heading, its self-audit and the atlas grid.
 *
 * It takes the parsed anatomy and calls `componentCountFor` rather than adding a pre-summed number
 * of its own, so this really is the fifth *reader* of that one sum rather than a second
 * implementation of it. A label that disagrees with the prompt is how a user comes to expect the
 * wrong number of components, and two additions that must stay equal is how they come to disagree.
 */
export function directionalModeChoices(
  additional: readonly AnatomyComponent[],
): readonly OutputChoice<DirectionalMode>[] {
  const total = (mode: DirectionalMode) => componentCountFor(mode, additional);

  return [
    {
      value: 'CORE_DIRECTIONAL_VARIANTS',
      label: `CORE_DIRECTIONAL_VARIANTS (${String(total('CORE_DIRECTIONAL_VARIANTS'))} components — recommended)`,
    },
    {
      value: 'SINGLE_DIRECTION_POSE_LIBRARY',
      label: `SINGLE_DIRECTION_POSE_LIBRARY (${String(total('SINGLE_DIRECTION_POSE_LIBRARY'))} components)`,
    },
    {
      value: 'CUTOUT_RIG_SINGLE_DIRECTION',
      label: `CUTOUT_RIG_SINGLE_DIRECTION (${String(total('CUTOUT_RIG_SINGLE_DIRECTION'))} components)`,
    },
    {
      value: 'TILESET_MODULAR',
      label: `TILESET_MODULAR (${String(total('TILESET_MODULAR'))} tiles)`,
    },
  ];
}
