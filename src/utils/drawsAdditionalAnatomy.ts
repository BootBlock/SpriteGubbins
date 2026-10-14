import { sheetPlanFor } from '../constants/sheetPlans/index.ts';
import type { DirectionalMode } from '../types/output.ts';
import type { DirectionSet } from '../types/rendering.ts';
import type { SheetSubject, SubjectCategory } from '../types/subject.ts';
import { anatomyFacingsFor } from './componentSet.ts';

/**
 * Whether this sheet draws any of the subject's additional anatomy, by either of the two routes: the
 * block `componentBreakdownFor` appends (`anatomyFacingsFor`), or a group of the plan's own marked
 * `additional`, which is how ICON's overlay sheets list their share of the *Extra Overlay Pieces*.
 *
 * What the field's note asks of every sheet (`additionalAnatomyNote`), so a finding about the pieces is
 * reported for the sheets that draw them, whichever route those sheets take.
 */
export function drawsAdditionalAnatomy(
  category: SubjectCategory,
  subject: SheetSubject,
  mode: DirectionalMode,
  directions: DirectionSet,
  sheetIndex: number,
): boolean {
  return (
    anatomyFacingsFor(category, subject, mode, directions, sheetIndex) !== null ||
    sheetPlanFor(category, subject, mode, directions, sheetIndex).groups.some(
      (group) => group.additional === true,
    )
  );
}
