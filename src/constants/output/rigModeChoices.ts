import { offersRigMode } from '../sheetPlans/index.ts';
import type { SheetSeries } from '../../types/components.ts';
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
 * The rigs this sheet can be asked for, labelled.
 *
 * **Scoped to the category**, which is the studio half of the fix `CATEGORY_RIG_MODES` describes: the
 * control used to offer all three to everything, against a default of `POSE_LIBRARY`, so section 5's
 * pivot rules reached a tileset, a nine-slice and a flipbook without anyone selecting anything. A rig
 * the category has no joints for is not rendered, so the mismatch cannot be chosen in the first
 * place.
 *
 * **And scoped to the sheets the pairing produces**, which is the same argument one level further
 * in. A pose library, an articulation sheet and a part library each draw a moving part once per
 * position it takes, so `CUTOUT_RIG` — whose first rule is that no piece commits to a position —
 * asks those sheets for the opposite of what section 4 has already required of them.
 * `offersRigMode` is where that is decided; this reads it, so the pairing cannot be chosen either.
 *
 * It is the whole series rather than the selected sheet for the reason that function gives: a
 * pairing is one deliverable, and a rig stated on half of a set that has to assemble is the same
 * failure the refusal exists to stop.
 *
 * Nine of the thirteen categories are left with one entry, and the control is not what the studio shows
 * them — a select offering a single option is a control with nothing to do, so `RiggingFields` says
 * why the choice is absent instead. This still returns the list rather than the emptiness, because
 * `NONE` is genuinely what those sheets are and the collapsed group's digest names it. Dropping the
 * cut-out rig never reaches that floor: the four categories it can be dropped from offer three.
 *
 * **The sheet that *is* a rig is deliberately not narrowed here.** `fixedRigMode` settles it, and
 * `RiggingFields` shows the whole list disabled at that value rather than a select with one option —
 * a control saying which setting took the choice over, where an emptied list would say the category
 * has no rig at all.
 */
export function rigModeChoices(
  category: SubjectCategory,
  series: SheetSeries,
): readonly OutputChoice<RigMode>[] {
  return RIG_MODE_LABELS.filter((choice) => offersRigMode(category, series, choice.value));
}
