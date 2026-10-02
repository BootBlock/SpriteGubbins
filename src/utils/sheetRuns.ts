import { resolveMode, sheetPlanFor } from '../constants/sheetPlans/index.ts';
import type { OutputConfig } from '../types/output.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';
import { generatePrompt } from './promptCompiler.ts';
import { sheetBatch } from './sheetBatch.ts';
import type { BatchSheet } from './sheetBatch.ts';
import { sheetDirections } from './sheetDirections.ts';

/**
 * Turning one studio configuration into the sheets it actually takes to satisfy it.
 *
 * An eight-direction cut-out rig is 15 pieces × 8 facings = 120 components, far past what a single
 * generation delivers, so `baseline-prompt-new.md` §4 settles on eight runs of fifteen tied together
 * by one identity lock. That was documented as a manual workflow: configure, copy, change the
 * facing, copy again, eight times, without losing count. This is that workflow as a function.
 *
 * **Which sheets a batch holds is `sheetBatch.ts`'s answer, not this file's.** Enumerating a batch
 * and compiling one are different costs with different callers — the studio counts the sheets on
 * every keystroke and the compiler asks where in the batch it is, neither of which should pay for a
 * prompt — so this is the enumeration with a prompt attached to each entry.
 *
 * **Pure, and deliberately outside both the compiler and the store.** The compiler stays a function
 * of one configuration to one prompt — a compiler that sometimes returned eight would have to be
 * read as two functions — and a store would make the run list state to keep in sync rather than an
 * answer derived from what the studio already holds.
 */

/**
 * One sheet of a batch, with the prompt that produces it.
 *
 * Nothing but a {@link BatchSheet} and its text: a run *is* one of the batch's sheets, so declaring
 * a second shape holding the same four fields would be two descriptions of one thing, free to drift
 * — and it is `sheetBatch` that decides what a sheet is.
 */
export interface SheetRun extends BatchSheet {
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
 * What identifies a sheet is who is on it, what is on it, and which facings it draws. Everything
 * else describes how that sheet is drawn, not which sheet it is. Editing the subject *does*
 * invalidate the batch, and correctly resets the progress: those are different sheets of a different
 * character.
 *
 * **What is on it is the sheet's own entries, not ICON's whole roster.** An icon set is the one subject
 * whose inventory is a list the reader extends, and keying on the roster un-marked every copied sheet the
 * moment one more icon was ticked — including the overlay sheet and every full grid, whose prompts had
 * not changed. So the roster is left out of the subject and the drawn sheet's entries stand in for it:
 * a sheet whose icons did not move keeps its tick, and the sheet that took the new icon loses its own.
 * The roster's look stays in the key, because it rewrites every sheet's prompt while leaving an icon
 * sheet's entries as they were: a set switched to full-bleed squares has copied none of them yet.
 *
 * **Every part is the *resolved* answer, never the stored field it came from.** A configuration
 * holds a direction set and a primary facing whether or not the mode reads them — a
 * `CORE_DIRECTIONAL_VARIANTS` sheet discards both — so keying on the raw fields declared a finished
 * batch unstarted because the user had visited a rig mode and changed a control that never reached
 * these prompts. Two configurations that compile to the same sheet now key the same, which is what
 * the question was asking all along.
 */
export function sheetIdentity(
  category: SubjectCategory,
  subject: SubjectDefinition,
  output: OutputConfig,
): string {
  const mode = resolveMode(category, subject, output.directionalMode);
  const plan = sheetPlanFor(category, subject, mode, output.directions, output.sheetIndex);
  const { covered } = sheetDirections(category, output, plan);
  const { icons, ...fields } = subject;
  const entries = plan.groups.flatMap((group) => group.entries.map((entry) => [entry.label, entry.text]));
  // The look joins the key only where there is a roster, so every other category keeps the key it had.
  const look = icons === undefined ? [] : [icons.look];
  return JSON.stringify([category, fields, ...look, mode, plan.name, entries, covered]);
}

/**
 * Every sheet this configuration asks for, each with the prompt that produces it.
 *
 * The identity lock is not touched: every run is the same configuration bar its facing and its
 * sheet, so all of them carry whatever lock the studio holds. That is the mechanism tying the sheets
 * to one subject — §5's "the hardest part is not sheet one; it is sheet two matching sheet one" —
 * and splitting is precisely the moment it starts to matter.
 */
export function sheetRuns(
  category: SubjectCategory,
  subject: SubjectDefinition,
  output: OutputConfig,
): readonly SheetRun[] {
  return sheetBatch(category, subject, output).sheets.map((sheet) => ({
    ...sheet,
    promptText: generatePrompt(category, subject, sheet.output),
  }));
}
