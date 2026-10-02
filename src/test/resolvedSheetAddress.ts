import { resolveDirectionSet } from '../constants/categoryDirectionSets.ts';
import { resolveMode, resolveSheetIndex } from '../constants/sheetPlans/index.ts';
import type { DirectionalMode } from '../types/output.ts';
import type { DirectionSet } from '../types/rendering.ts';
import type { SheetSubject, SubjectCategory } from '../types/subject.ts';

/**
 * The sheet a stored mode, direction set and sheet index compile to once the category has narrowed
 * them, as one key — what a sweep compiles ICON at once per address rather than once per stored
 * pairing.
 *
 * **ICON offers one mode and one set**, so every other stored mode and set resolves to the same sheets,
 * and its whole-catalogue rosters run to dozens of them: compiled once per stored pairing, a sweep
 * repeats each sheet for every mode and set the category declines, which is most of its time and none
 * of its coverage. The raw stored values still reach the compiler for every other category, where the
 * narrowing is what a sweep exists to test, and `promptCompiler.test.ts` holds ICON's skipped pairings
 * to the prompt their resolution names.
 */
export function resolvedSheetAddress(
  category: SubjectCategory,
  subject: SheetSubject,
  mode: DirectionalMode,
  directions: DirectionSet,
  sheetIndex: number,
): string {
  return [
    resolveMode(category, subject, mode),
    resolveDirectionSet(category, directions),
    resolveSheetIndex(category, subject, mode, directions, sheetIndex),
  ].join('|');
}
