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
 * repeats each sheet for every mode and set the category declines. The repeats add coverage only if
 * the compiler reads a stored value unresolved somewhere, and that one question is asked once, for
 * every subject, flag and sheet the sweeps skip, by `iconSkippedPairings.ts` (three
 * `promptCompilerIconSkip*.test.ts` files, one per variant, so they run side by side). The raw stored
 * values still reach the sweeps' compiles for every other category, where the narrowing is what a
 * sweep exists to test.
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
