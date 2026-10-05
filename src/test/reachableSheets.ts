import { CATEGORY_DIRECTION_SETS } from '../constants/categoryDirectionSets.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { modesFor, sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import type { SheetPlan } from '../types/components.ts';
import type { OutputConfig } from '../types/output.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';
import { sheetFacts } from '../utils/promptFacts.ts';
import { assemblyBaseCases } from './assemblyBaseCases.ts';

/** One sheet a reader can reach, addressed by its case and output, with the plan the compiler resolves. */
export interface ReachableSheet {
  readonly where: string;
  readonly category: SubjectCategory;
  readonly subject: SubjectDefinition;
  readonly output: OutputConfig;
  readonly plan: SheetPlan;
}

/**
 * Every sheet each case reaches — each mode, reachable direction set and series position — with the
 * plan it resolves to, for a sweep to divide between its tests by what the plan declares.
 *
 * **One test per sheet, not per case.** A sweep ran one test per subject (`assemblyBaseCases`) until a
 * category's worth of ICON's whole-catalogue rosters outgrew Vitest's five-second limit, and a single
 * roster's twenty-odd sheets then outgrew the one-second limit a slow runner stands in for. Resolving a
 * plan compiles no prompt, so the sheets are listed and divided here and each test compiles one prompt.
 *
 * Shared by `utils/componentBoundary.test.ts` and `utils/identityConsistency.test.ts`, which sweep the
 * same sheets for two different declarations.
 */
export function reachableSheets(): readonly ReachableSheet[] {
  return assemblyBaseCases().flatMap(([name, category, subject]) =>
    outputsOf(category, subject).map((output) => ({
      where: `${name}/${output.directionalMode}/${output.directions}/${String(output.sheetIndex)}`,
      category,
      subject,
      output,
      // The plan the compiler itself resolves, rather than one looked up beside it.
      plan: sheetFacts(category, subject, output).plan,
    })),
  );
}

/** Every output configuration that addresses one of the subject's sheets. */
export function outputsOf(category: SubjectCategory, subject: SubjectDefinition): readonly OutputConfig[] {
  return modesFor(category, subject).flatMap((directionalMode) =>
    CATEGORY_DIRECTION_SETS[category].flatMap((directions) => {
      const { length } = sheetSeriesFor(category, subject, directionalMode, directions);
      return Array.from({ length }, (_, sheetIndex) => ({
        ...DEFAULT_OUTPUT_CONFIG,
        directionalMode,
        directions,
        sheetIndex,
      }));
    }),
  );
}
