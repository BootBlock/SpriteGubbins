import { expect } from 'vitest';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import type { DirectionalMode, OutputConfig } from '../types/output.ts';
import { DIRECTION_SETS } from '../types/rendering.ts';
import type { SubjectDefinition } from '../types/subject.ts';
import { generatePrompt } from '../utils/promptCompiler.ts';
import { assemblyBaseSubjectsOf } from './assemblyBaseSubjects.ts';
import { sheetIndicesOf } from './sheetIndicesOf.ts';

/** One ICON configuration a sweep compiles once per resolved address. */
export interface IconSkippedConfiguration {
  readonly name: string;
  readonly subject: SubjectDefinition;
  readonly flags: Partial<OutputConfig>;
}

/**
 * Every ICON configuration a sweep in `promptCompiler.test.ts` compiles once per resolved address
 * (`resolvedSheetAddress`) rather than once per stored pairing, by the variant each sweep adds: as the
 * multi-facing sweep compiles it (`plain`), with the companion outputs on as the punctuation sweep
 * does (`emitting`), and with named anatomy as the marker sweep does (`anatomy`). Each holds every
 * assembly-base subject: the starter set and the whole-catalogue rosters in both looks.
 */
export function iconSkippedConfigurations(
  variant: 'plain' | 'emitting' | 'anatomy',
): readonly IconSkippedConfiguration[] {
  return assemblyBaseSubjectsOf('ICON').map((base, at) => ({
    name: `subject ${String(at)}`,
    subject: variant === 'anatomy' ? { ...base, additional_anatomy: 'Sensor Vane ×2' } : base,
    flags: variant === 'emitting' ? { emitComponentMap: true, emitPromptFeedback: true } : {},
  }));
}

/**
 * Asserts that one stored mode compiles every sheet of `configuration` — and the index past the last —
 * under every stored direction set to the prompt ICON's offered pairing compiles.
 *
 * **What makes the sweeps' skip safe.** A stored mode and set ICON does not offer reach the compiler
 * raw here, so a compiler reading one of them unresolved anywhere would show as a different prompt.
 * One mode per call, because a whole-catalogue roster is two dozen sheets and every one of them is
 * compiled once per set.
 */
export function expectSkippedPairingsMatch(
  configuration: IconSkippedConfiguration,
  directionalMode: DirectionalMode,
): void {
  const { subject, flags } = configuration;
  const offered = { directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY', directions: 'SINGLE_FRONT' } as const;
  const output = (overrides: Partial<OutputConfig>): OutputConfig => ({
    ...DEFAULT_OUTPUT_CONFIG,
    ...flags,
    ...overrides,
  });
  for (const sheetIndex of sheetIndicesOf('ICON', subject, offered.directionalMode, offered.directions)) {
    const expected = generatePrompt('ICON', subject, output({ ...offered, sheetIndex }));
    for (const directions of DIRECTION_SETS) {
      expect(
        generatePrompt('ICON', subject, output({ directionalMode, directions, sheetIndex })),
        `${directionalMode}/${directions}/${String(sheetIndex)}`,
      ).toBe(expected);
    }
  }
}
