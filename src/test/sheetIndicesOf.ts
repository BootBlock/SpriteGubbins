import { sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import type { DirectionalMode } from '../types/output.ts';
import type { DirectionSet } from '../types/rendering.ts';
import type { SheetSubject, SubjectCategory } from '../types/subject.ts';

/**
 * Every sheet index a configuration can be compiled at: each sheet its own series holds, then one past
 * the end, which `resolveSheetIndex` reads as the first sheet.
 *
 * **What a sweep over every sheet loops over, rather than `SHEET_INDEX_RANGE`.** That range bounds what
 * storage may hold, and ICON's roster stretches it to twenty-three sheets, so a sweep looping to it
 * compiled every other pairing's first sheet twenty times over and swept nothing more. This is the
 * series the configuration actually has, with the one out-of-range index that proves the fallback.
 */
export function sheetIndicesOf(
  category: SubjectCategory,
  subject: SheetSubject,
  mode: DirectionalMode,
  directions: DirectionSet,
): readonly number[] {
  const { length } = sheetSeriesFor(category, subject, mode, directions);
  return Array.from({ length: length + 1 }, (_, index) => index);
}
