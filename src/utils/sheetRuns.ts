import { DIRECTION_COVERAGE, DIRECTION_LISTS } from '../constants/promptText/index.ts';
import type { OutputConfig } from '../types/output.ts';
import type { Direction } from '../types/rendering.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';
import { generatePrompt } from './promptCompiler.ts';
import { sheetDirections } from './sheetDirections.ts';

/**
 * Turning one studio configuration into the sheets it actually takes to satisfy it.
 *
 * An eight-direction cut-out rig is 15 pieces × 8 facings = 120 components, far past what a single
 * generation delivers, so `baseline-prompt-new.md` §4 settles on eight runs of fifteen tied together
 * by one identity lock. That was documented as a manual workflow: configure, copy, change the
 * facing, copy again, eight times, without losing count. This is that workflow as a function.
 *
 * **Pure, and deliberately outside both the compiler and the store.** The compiler stays a function
 * of one configuration to one prompt — a compiler that sometimes returned eight would have to be
 * read as two functions — and a store would make the run list state to keep in sync rather than an
 * answer derived from what the studio already holds.
 */

/** One sheet of a split: the facing it covers, the configuration that asks for it, and its prompt. */
export interface SheetRun {
  readonly direction: Direction;
  /**
   * The studio configuration for this run alone, differing from the one it was split from only in
   * `primaryDirection`. Carried so the run can be logged and later restored *as itself* — a history
   * entry holding the batch's configuration would restore to run one whatever prompt it shows.
   */
  readonly output: OutputConfig;
  readonly promptText: string;
}

/**
 * What makes two prompts the *same sheet of the same batch*, for deciding which runs are done.
 *
 * Deliberately **not** the prompt text, which is the obvious answer and the wrong one. §5 advises
 * writing the identity lock from the first sheet you accept, so the lock is *expected* to arrive
 * part-way through a batch — and it is compiled into every run, so matching on text would declare
 * all eight runs unstarted the moment the user took that advice. Switching target model or raising
 * the component budget mid-batch would do the same.
 *
 * What identifies a sheet is who is on it and which facing of which run list it is. Everything else
 * describes how that sheet is drawn, not which sheet it is. Editing the subject *does* invalidate
 * the batch, and correctly resets the progress: those are different sheets of a different character.
 */
export function sheetIdentity(
  category: SubjectCategory,
  subject: SubjectDefinition,
  output: OutputConfig,
): string {
  return JSON.stringify([
    category,
    subject,
    output.directionalMode,
    output.directions,
    output.primaryDirection,
  ]);
}

/**
 * Whether this configuration is more than one sheet.
 *
 * Both halves matter. A mode whose coverage is a fixed set already draws its facings on one sheet,
 * so there is nothing to split; and a single-facing set is one run however the mode covers it.
 */
export function splitsIntoRuns(output: OutputConfig): boolean {
  return (
    DIRECTION_COVERAGE[output.directionalMode] === 'primary' && DIRECTION_LISTS[output.directions].length > 1
  );
}

/**
 * Every sheet this configuration asks for, in the order the direction set lists them.
 *
 * One run per facing when the mode covers one facing at a time; otherwise exactly one run, because
 * a mode written against a fixed set of facings is already a single sheet and splitting it would
 * ask for the same components repeatedly.
 *
 * The identity lock is not touched: every run is the same configuration bar its facing, so all of
 * them carry whatever lock the studio holds. That is the mechanism tying the sheets to one subject
 * — §5's "the hardest part is not sheet one; it is sheet two matching sheet one" — and splitting is
 * precisely the moment it starts to matter.
 */
export function sheetRuns(
  category: SubjectCategory,
  subject: SubjectDefinition,
  output: OutputConfig,
): readonly SheetRun[] {
  if (!splitsIntoRuns(output)) {
    // Labelled with the facing the sheet actually assembles towards, which for a fixed-coverage mode
    // is its own set's first rather than the chosen set's — `CORE_DIRECTIONAL_VARIANTS` draws
    // front-three-quarter however the direction control is set.
    const { assembly } = sheetDirections(output);
    return [{ direction: assembly, output, promptText: generatePrompt(category, subject, output) }];
  }

  return DIRECTION_LISTS[output.directions].map((direction) => {
    const runOutput: OutputConfig = { ...output, primaryDirection: direction };
    return { direction, output: runOutput, promptText: generatePrompt(category, subject, runOutput) };
  });
}
