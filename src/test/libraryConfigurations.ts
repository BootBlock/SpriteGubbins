/**
 * Every configuration the app composes a prompt from without the reader writing a word: each shipped
 * preset, and each category's opening studio configuration.
 *
 * The defaults are what makes this a claim about the *app* rather than about the library. Compiled
 * for Qwen-Image, the smallest configuration is a sparse single-view item at roughly 3,300 estimated
 * tokens and the character default a five-view sheet at about 6,700, and a target whose ceiling
 * falls between them is exactly the case a per-preset measurement cannot see.
 *
 * It is not a sweep of the whole option space, and does not need to be: what a description claims is
 * what a reader will actually be handed, and a reader who has chosen nothing gets a default.
 *
 * **Configurations rather than prompts**, because a prompt is a function of the target it is
 * compiled for, and both consumers measure a target's ceiling against the text that target receives.
 * `test/promptFit.ts` compiles each one for the target it measures, for a fit claim about what
 * arrives unprompted; `constants/promptText/guardExemptionBudget.test.ts` varies the subject as well,
 * to price wording that only a reader's pick puts into the prompt. One list is what keeps the two
 * readings agreeing about which configurations exist.
 *
 * **No configuration carries a target**, and that is the half a list of prompts could not state. A
 * preset's own `targetModel` is the one output field neither consumer may compile with: measuring a
 * prompt compiled for Sol against GPT Image's ceiling is how #231 read GPT Image's largest sheet
 * 3,784 characters longer than anything a GPT Image reader receives. Taking the field out of the
 * type makes a consumer that forgets to supply the target fail to type-check, rather than measure
 * somebody else's prompt.
 */

import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { PRESETS } from '../constants/presets/index.ts';
import type { OutputConfig } from '../types/output.ts';
import { SUBJECT_CATEGORIES } from '../types/subject.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';
import { withCompanionOutputs } from '../utils/imageConfig.ts';

/** Every output setting but the target, which the consumer measuring a ceiling supplies. */
type UntargetedOutput = Omit<OutputConfig, 'targetModel'>;

/** One configuration, with the name a failure message should give it. */
export interface LibraryConfiguration {
  readonly name: string;
  readonly category: SubjectCategory;
  readonly subject: SubjectDefinition;
  readonly output: UntargetedOutput;
}

/** `output` with its target removed, so the value holds no more than its type says it does. */
function untargeted(output: OutputConfig): UntargetedOutput {
  const { targetModel: _targetModel, ...rest } = output;
  return rest;
}

export const LIBRARY_CONFIGURATIONS: readonly LibraryConfiguration[] = [
  ...PRESETS.map((preset) => ({
    name: preset.name,
    category: preset.category,
    subject: preset.subject,
    // Compiled the way a reader who has touched nothing else gets it: a preset carries no companion
    // outputs of its own, and both of the studio's default to off.
    output: untargeted(withCompanionOutputs(preset.output, DEFAULT_OUTPUT_CONFIG)),
  })),
  ...SUBJECT_CATEGORIES.map((category) => ({
    name: `the ${category} studio default`,
    category,
    subject: defaultSubjectFor(category),
    output: untargeted(DEFAULT_OUTPUT_CONFIG),
  })),
];
