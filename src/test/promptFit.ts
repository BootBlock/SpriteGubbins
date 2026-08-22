/**
 * How much of what this app composes a target's documented ceiling actually holds.
 *
 * `models.ts` describes each target to the reader choosing one, and several of those descriptions
 * make a claim about *length* — that the whole specification fits, that only the opening is read.
 * Those are claims about this app's own output, so they are measurable, and one of them was wrong
 * for the life of the entry: Qwen-Image's said the full specification fits inside 4.5K tokens while
 * the studio's opening configuration compiled to nearly 6,900. `PromptBudgetNotice` then said the
 * opposite on the same screen.
 *
 * Nothing could catch it, because the only budget assertion in the suite measured each preset
 * against *its own* declared target — and the presets naming Qwen are the small ones. This is where
 * that gap is closed: it measures the whole library against every ceiling, so a claim about a target
 * nobody wrote a preset for is checked anyway.
 *
 * In `src/test/` because it is test support with two consumers — `constants/models.test.ts`, which
 * holds the descriptions to it, and `constants/presets/presetCoverage.test.ts`, which decides from
 * it which targets the library owes a worked example.
 */

import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { PRESETS } from '../constants/presets/index.ts';
import type { PromptBudgetFigure, TargetModelId } from '../types/output.ts';
import { SUBJECT_CATEGORIES } from '../types/subject.ts';
import { withCompanionOutputs } from '../utils/imageConfig.ts';
import { readPromptBudget } from '../utils/promptBudget.ts';
import { promptBudgetFigureFor } from '../utils/targetCapabilities.ts';
import { generatePrompt } from '../utils/promptCompiler.ts';

/**
 * How much of its target's documented ceiling a shipped preset is allowed to actually spend.
 *
 * `used <= limit` is the wrong bar, and the library found both reasons it is. A token reading is the
 * app's ~4-characters-per-token estimate — no tokeniser ships with the app, and every target uses a
 * different one — so a preset landing *on* its ceiling has not been shown to fit anything: the
 * estimate's error is wider than the margin being measured, which is precisely the reading
 * `readPromptBudget` disclaims in its own doc comment. And a preset is measured against a template it
 * *shares*, so one with no slack turns the next wording change anywhere in `promptTemplate.ts` into a
 * failure. A §4 rewording with nothing to do with any preset met that against a margin of four
 * estimated tokens: its first draft tripped the assertion, and the wording that landed had to be
 * measured against the ceiling rather than chosen for the sheet.
 *
 * A fifth of the ceiling answers both: it is wider than the estimate's error against prose this
 * punctuation-dense, and it is room the template can grow into without a preset having to be tuned
 * to the character to stay inside it.
 *
 * The same share decides {@link PromptFit}, and deliberately: "this configuration fits" is the claim
 * a description makes, and a fit with no slack is the one that stops being true on the next wording
 * change. A `characters` budget carries none of the estimator's error, but it shares the second
 * argument entirely.
 */
export const MAX_BUDGET_SHARE = 0.8;

/** How much of what the app composes a ceiling holds, at {@link MAX_BUDGET_SHARE}. */
export type PromptFit = 'ALL' | 'SOME' | 'NONE';

/** One target's ceiling, measured against every prompt the app ships a configuration for. */
export interface PromptFitReading {
  readonly budget: PromptBudgetFigure;
  /** {@link MAX_BUDGET_SHARE} of the ceiling, in the budget's own unit. */
  readonly allowance: number;
  readonly smallest: number;
  readonly largest: number;
  readonly fit: PromptFit;
}

/**
 * Every prompt the app composes without the reader writing a word: each shipped preset, and each
 * category's opening studio configuration.
 *
 * The defaults are what makes this a claim about the *app* rather than about the library. The
 * smallest preset is a sparse single-view item at roughly 3,100 estimated tokens and the largest
 * default is a five-view creature at nearly 6,900, and a target whose ceiling falls between them is
 * exactly the case a per-preset measurement cannot see.
 *
 * It is not a sweep of the whole option space, and does not need to be: what a description claims is
 * what a reader will actually be handed, and a reader who has chosen nothing gets a default.
 */
const LIBRARY_PROMPTS: readonly string[] = [
  ...PRESETS.map((preset) =>
    generatePrompt(
      preset.category,
      preset.subject,
      withCompanionOutputs(preset.output, DEFAULT_OUTPUT_CONFIG),
    ),
  ),
  ...SUBJECT_CATEGORIES.map((category) =>
    generatePrompt(category, defaultSubjectFor(category), DEFAULT_OUTPUT_CONFIG),
  ),
];

/**
 * Measure every prompt in {@link LIBRARY_PROMPTS} against one target's ceiling, or `null` where the
 * target has none to measure against.
 *
 * **A ceiling only, never a guidance figure**, which is the one place these two measure differently
 * from the studio's notice. What this reading decides is what a description may claim about fitting
 * and which targets the preset library owes a worked example — both of them claims about the prompt
 * *arriving*, which is what a ceiling is about and what advice is not. Seedream's 600 words would
 * otherwise put every prompt this app composes at `NONE` and take the five presets naming it out of
 * the library, on the strength of a figure past which ByteDance still read the whole brief.
 *
 * Each prompt is measured through {@link readPromptBudget} rather than against the ceiling here, so
 * a reading in this file and the reading the studio puts in front of the user are the same
 * arithmetic in the same unit — `MEASURES` in `utils/promptBudget.ts` decides which counter each
 * unit takes, and both readings go through it. A second spelling of that table is how the two would
 * come to disagree about what a target reads.
 */
export function measurePromptFit(target: TargetModelId): PromptFitReading | null {
  if (promptBudgetFigureFor(target)?.kind !== 'CEILING') return null;

  const readings = LIBRARY_PROMPTS.map((prompt) => readPromptBudget(prompt, target));
  const [first] = readings;
  // `readPromptBudget` answers `null` for a target with no published figure, and it answers it for
  // every prompt or none — the budget is a property of the target alone.
  if (first === undefined || first === null) return null;

  const sizes = readings.filter((reading) => reading !== null).map((reading) => reading.used);
  const allowance = Math.floor(first.budget.limit * MAX_BUDGET_SHARE);
  const fitting = sizes.filter((size) => size <= allowance).length;

  return {
    budget: first.budget,
    allowance,
    smallest: Math.min(...sizes),
    largest: Math.max(...sizes),
    fit: fitting === sizes.length ? 'ALL' : fitting === 0 ? 'NONE' : 'SOME',
  };
}
