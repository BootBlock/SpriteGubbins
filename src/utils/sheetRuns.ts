import { DIRECTION_LISTS } from '../constants/promptText/index.ts';
import { resolveMode, sheetPlanFor, sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import { sheetCountFor } from './componentSet.ts';
import type { OutputConfig } from '../types/output.ts';
import type { Direction } from '../types/rendering.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';
import { generatePrompt } from './promptCompiler.ts';
import { directionSetApplies, sheetDirections } from './sheetDirections.ts';

/**
 * Turning one studio configuration into the sheets it actually takes to satisfy it.
 *
 * An eight-direction cut-out rig is 15 pieces × 8 facings = 120 components, far past what a single
 * generation delivers, so `baseline-prompt-new.md` §4 settles on eight runs of fifteen tied together
 * by one identity lock. That was documented as a manual workflow: configure, copy, change the
 * facing, copy again, eight times, without losing count. This is that workflow as a function.
 *
 * **A batch splits along two axes, and they multiply.** The facing axis is that run list: a mode
 * that defers to the chosen direction set draws one sheet per facing of it. The *series* axis is the
 * plan's own — a pairing whose inventory outgrew one generation arrives as more than one sheet, each
 * carrying a different part of it, which is what lets a character's directional core be five views
 * instead of the three that fitted beside its limbs. Every combination of the two is a sheet the
 * user has to generate, so the runs are their cross product rather than a choice between them.
 *
 * **Pure, and deliberately outside both the compiler and the store.** The compiler stays a function
 * of one configuration to one prompt — a compiler that sometimes returned eight would have to be
 * read as two functions — and a store would make the run list state to keep in sync rather than an
 * answer derived from what the studio already holds.
 */

/** One sheet of a batch: what it carries, the facing it assembles towards, and its prompt. */
export interface SheetRun {
  /**
   * What is on this sheet, from its plan — `Directional core`, `Articulation`, `Rig pieces`.
   *
   * The half of a run's label that does not change between facings, and the half that used to have
   * nowhere to live: a run row naming only its facing said nothing about what was on it, which was
   * survivable while every batch was one plan repeated and is not once a batch is two different
   * inventories.
   */
  readonly name: string;
  /** The facing this sheet assembles towards, which fixes its depth order. */
  readonly assembly: Direction;
  /**
   * Every facing this sheet draws.
   *
   * Carried beside the assembly direction because the two differ for exactly the sheet that made a
   * series necessary: a directional core draws five facings and assembles towards the first of them,
   * so a row labelled with the assembly alone would read identically to the single-facing
   * articulation sheet beneath it and claim the same coverage.
   */
  readonly covered: readonly [Direction, ...Direction[]];
  /**
   * The studio configuration for this run alone, differing from the one it was split from in its
   * facing, its sheet of the series, or both. Carried so the run can be logged and later restored
   * *as itself* — a history entry holding the batch's configuration would restore to run one
   * whatever prompt it shows.
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
 * What identifies a sheet is who is on it, what is on it, and which facings it draws. Everything
 * else describes how that sheet is drawn, not which sheet it is. Editing the subject *does*
 * invalidate the batch, and correctly resets the progress: those are different sheets of a different
 * character.
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
  const mode = resolveMode(category, output.directionalMode);
  const plan = sheetPlanFor(category, mode, output.sheetIndex);
  const { covered } = sheetDirections({ ...output, directionalMode: mode }, plan);
  return JSON.stringify([category, subject, mode, plan.name, covered]);
}

/**
 * Whether the chosen direction set makes this configuration more than one sheet.
 *
 * Both halves matter, and they are two different questions. The first is whether the mode defers to
 * the chosen set at all — `directionSetApplies`, which is also what decides whether the studio shows
 * the set control, so the two cannot drift apart and the panel cannot offer a split for a set it is
 * not displaying. The second is this function's own: a single-facing set is one run however the mode
 * covers it.
 *
 * This is the **facing** axis alone, which is why it is not what the split button asks. A pairing
 * whose series holds two sheets is a batch even on a single facing — see {@link sheetRunCount}.
 */
export function splitsIntoFacingRuns(output: OutputConfig): boolean {
  return directionSetApplies(output) && DIRECTION_LISTS[output.directions].length > 1;
}

/**
 * How many sheets this configuration is, without compiling any of them.
 *
 * The two axes multiplied. Separate from {@link sheetRuns} because the studio asks this on every
 * keystroke to decide whether to offer the split at all, and compiling a batch of prompts to find
 * out how many there are would be the work the answer exists to avoid.
 */
export function sheetRunCount(category: SubjectCategory, output: OutputConfig): number {
  // Both axes asked of the *resolved* pairing. A configuration can name a mode its category has no
  // plan for, and the compiler resolves it — so counting the facings from the stored mode while
  // counting the sheets from the resolved one would offer eight runs of a mode that draws its own
  // facings and ignores every one of them, giving eight rows with the same prompt.
  const resolved: OutputConfig = {
    ...output,
    directionalMode: resolveMode(category, output.directionalMode),
  };
  const facings = splitsIntoFacingRuns(resolved) ? DIRECTION_LISTS[resolved.directions].length : 1;
  return facings * sheetCountFor(category, resolved.directionalMode);
}

/**
 * Every sheet this configuration asks for: each facing of the run list, and within it each sheet of
 * the series.
 *
 * **Facing-major**, so a batch that splits both ways is worked through one facing at a time rather
 * than one inventory at a time. That is the order the identity lock wants — everything drawn towards
 * one facing is the hardest thing to keep consistent, so it is generated together — and it is also
 * the order that leaves both single-axis batches exactly as they were: a rig over eight facings is
 * its eight runs in set order, and a two-sheet series on a fixed set is its two sheets in plan order.
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
  const mode = resolveMode(category, output.directionalMode);
  const series = sheetSeriesFor(category, mode);

  // The chosen set where the *resolved* mode reads it as a run list; otherwise the configuration's
  // own single answer, left exactly as it stands so a sheet that ignores the facing is not rewritten
  // by it. Resolved, for the reason `sheetRunCount` gives — and the two must agree, since the studio
  // reads the count and the drawer renders the list.
  const facings: readonly (Direction | null)[] = splitsIntoFacingRuns({ ...output, directionalMode: mode })
    ? DIRECTION_LISTS[output.directions]
    : [output.primaryDirection];

  return facings.flatMap((primaryDirection) =>
    series.map((plan, sheetIndex) => {
      const runOutput: OutputConfig = { ...output, primaryDirection, sheetIndex };
      const { covered, assembly } = sheetDirections({ ...runOutput, directionalMode: mode }, plan);
      return {
        name: plan.name,
        assembly,
        covered,
        output: runOutput,
        promptText: generatePrompt(category, subject, runOutput),
      };
    }),
  );
}
