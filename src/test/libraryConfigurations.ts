/**
 * Every configuration the app composes a prompt from without the reader writing a word: each shipped
 * preset, and each category's opening studio configuration.
 *
 * The defaults are what makes this a claim about the *app* rather than about the library. The
 * smallest preset is a sparse single-view item at roughly 3,100 estimated tokens and the largest
 * default is a five-view creature at nearly 6,900, and a target whose ceiling falls between them is
 * exactly the case a per-preset measurement cannot see.
 *
 * It is not a sweep of the whole option space, and does not need to be: what a description claims is
 * what a reader will actually be handed, and a reader who has chosen nothing gets a default.
 *
 * **Configurations rather than prompts**, because the two consumers compile them differently.
 * `test/promptFit.ts` compiles each one as it stands, for a fit claim about what arrives unprompted;
 * `constants/promptText/guardExemptionBudget.test.ts` varies the subject and the target first, to
 * price wording that only a reader's pick puts into the prompt. One list is what keeps the two
 * readings agreeing about which configurations exist.
 */

import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { PRESETS } from '../constants/presets/index.ts';
import type { OutputConfig } from '../types/output.ts';
import { SUBJECT_CATEGORIES } from '../types/subject.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';
import { withCompanionOutputs } from '../utils/imageConfig.ts';

/** One configuration, with the name a failure message should give it. */
export interface LibraryConfiguration {
  readonly name: string;
  readonly category: SubjectCategory;
  readonly subject: SubjectDefinition;
  readonly output: OutputConfig;
}

export const LIBRARY_CONFIGURATIONS: readonly LibraryConfiguration[] = [
  ...PRESETS.map((preset) => ({
    name: preset.name,
    category: preset.category,
    subject: preset.subject,
    // Compiled the way a reader who has touched nothing else gets it: a preset carries no companion
    // outputs of its own, and both of the studio's default to off.
    output: withCompanionOutputs(preset.output, DEFAULT_OUTPUT_CONFIG),
  })),
  ...SUBJECT_CATEGORIES.map((category) => ({
    name: `the ${category} studio default`,
    category,
    subject: defaultSubjectFor(category),
    output: DEFAULT_OUTPUT_CONFIG,
  })),
];
