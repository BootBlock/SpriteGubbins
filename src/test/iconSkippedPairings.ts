import { expect } from 'vitest';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DIRECTIONAL_MODES } from '../types/output.ts';
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

/** The pairing ICON offers, whose prompt every skipped pairing must compile to. */
const OFFERED = { directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY', directions: 'SINGLE_FRONT' } as const;

/** One case of the guard: a configuration, one sheet of its series and one stored mode. */
export type IconSkippedCase = readonly [
  name: string,
  sheetIndex: number,
  directionalMode: DirectionalMode,
  configuration: IconSkippedConfiguration,
];

/**
 * The `it.each` cases for one variant: every configuration, at each sheet of its series and the index
 * past the last (which `resolveSheetIndex` reads as the first), under each stored mode.
 *
 * **One case per sheet and mode**, because a whole-catalogue roster is two dozen sheets and each is
 * compiled under every stored mode and set: as one case per configuration and mode, a roster outgrew
 * Vitest's five-second limit on a slow runner, and as one per sheet its first cases still came within
 * twice the time of it on two workers. A case compiles a prompt per direction set.
 */
export function iconSkippedCases(variant: 'plain' | 'emitting' | 'anatomy'): readonly IconSkippedCase[] {
  return iconSkippedConfigurations(variant).flatMap((configuration) =>
    sheetIndicesOf('ICON', configuration.subject, OFFERED.directionalMode, OFFERED.directions).flatMap(
      (sheetIndex) =>
        DIRECTIONAL_MODES.map((mode): IconSkippedCase => [
          configuration.name,
          sheetIndex,
          mode,
          configuration,
        ]),
    ),
  );
}

/** The offered pairing's prompt for each configuration and sheet, compiled once for all its modes' cases. */
const OFFERED_PROMPTS = new Map<string, string>();

function offeredPrompt(configuration: IconSkippedConfiguration, sheetIndex: number): string {
  const key = `${configuration.name}|${String(sheetIndex)}`;
  const cached = OFFERED_PROMPTS.get(key);
  if (cached !== undefined) return cached;
  const prompt = generatePrompt(
    'ICON',
    configuration.subject,
    outputOf(configuration, { ...OFFERED, sheetIndex }),
  );
  OFFERED_PROMPTS.set(key, prompt);
  return prompt;
}

function outputOf(configuration: IconSkippedConfiguration, overrides: Partial<OutputConfig>): OutputConfig {
  return { ...DEFAULT_OUTPUT_CONFIG, ...configuration.flags, ...overrides };
}

/**
 * Asserts that one sheet of `configuration` compiles, under one stored mode and every stored direction
 * set, to the prompt ICON's offered pairing compiles.
 *
 * **What makes the sweeps' skip safe.** A stored mode and set ICON does not offer reach the compiler
 * raw here, so a compiler reading one of them unresolved anywhere would show as a different prompt.
 */
export function expectSkippedPairingsMatch(
  configuration: IconSkippedConfiguration,
  sheetIndex: number,
  directionalMode: DirectionalMode,
): void {
  const expected = offeredPrompt(configuration, sheetIndex);
  for (const directions of DIRECTION_SETS) {
    expect(
      generatePrompt(
        'ICON',
        configuration.subject,
        outputOf(configuration, { directionalMode, directions, sheetIndex }),
      ),
      `${directionalMode}/${directions}/${String(sheetIndex)}`,
    ).toBe(expected);
  }
}
