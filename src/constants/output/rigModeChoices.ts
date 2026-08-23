import { supportsRigMode } from '../sheetPlans/index.ts';
import type { RigMode } from '../../types/rigging.ts';
import type { SubjectCategory } from '../../types/subject.ts';
import type { OutputChoice } from './choices.ts';

/**
 * What each rig is for, in the order a user meets them: the two that describe an articulated subject
 * first, and the answer for a sheet that does not articulate last.
 *
 * Module-private, and offered only through {@link rigModeChoices} — the same arrangement
 * `directionalModeChoices` has, and for the same reason. A `RIG_MODE_CHOICES` exported beside the
 * unconditional lists in `choices.ts` would be a second, unscoped way to fill this control, and the
 * one a new call site would reach for.
 */
const RIG_MODE_LABELS: readonly OutputChoice<RigMode>[] = [
  { value: 'POSE_LIBRARY', label: 'POSE_LIBRARY (rigid segments assembled by hand)' },
  { value: 'CUTOUT_RIG', label: 'CUTOUT_RIG (bones rotate the pieces at runtime)' },
  { value: 'NONE', label: 'NONE (not articulated — tilesets, props)' },
];

/**
 * The rigs this category can be asked for, labelled.
 *
 * **Scoped to the category**, which is the studio half of the fix `CATEGORY_RIG_MODES` describes: the
 * control used to offer all three to everything, against a default of `POSE_LIBRARY`, so section 5's
 * pivot rules reached a tileset, a nine-slice and a flipbook without anyone selecting anything. A rig
 * the category has no joints for is not rendered, so the mismatch cannot be chosen in the first
 * place.
 *
 * Nine of the thirteen categories are left with one entry, and the control is not what the studio shows
 * them — a select offering a single option is a control with nothing to do, so `RiggingFields` says
 * why the choice is absent instead. This still returns the list rather than the emptiness, because
 * `NONE` is genuinely what those sheets are and the collapsed group's digest names it.
 */
export function rigModeChoices(category: SubjectCategory): readonly OutputChoice<RigMode>[] {
  return RIG_MODE_LABELS.filter((choice) => supportsRigMode(category, choice.value));
}
