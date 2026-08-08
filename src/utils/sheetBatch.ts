import { resolveDirectionSet } from '../constants/categoryDirectionSets.ts';
import { DIRECTION_LISTS } from '../constants/promptText/index.ts';
import { resolveSheetIndex, sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import type { SheetPlan } from '../types/components.ts';
import type { OutputConfig } from '../types/output.ts';
import type { Direction } from '../types/rendering.ts';
import type { SubjectCategory } from '../types/subject.ts';
import { directionSetApplies, primaryFacing, sheetDirections } from './sheetDirections.ts';

/**
 * The batch one studio configuration is, before a word of it is compiled — and which sheet of that
 * batch the configuration itself names.
 *
 * **A batch splits along two axes, and they multiply.** The facing axis is a run list: a mode that
 * defers to the chosen direction set draws one sheet per facing of it. The *series* axis is the
 * plan's own — a pairing whose inventory outgrew one generation arrives as more than one sheet, each
 * carrying a different part of it. Every combination is a sheet the user has to generate, so the
 * batch is their cross product rather than a choice between them.
 *
 * **Separate from `sheetRuns.ts` because two of its three readers want this answer without the
 * prompts.** The studio asks the *count* on every keystroke to decide whether to offer the split at
 * all, and the compiler asks where in the batch the sheet it is compiling sits so the prompt can
 * say so; only the split drawer wants the compiled text. Enumerating here and compiling there is
 * also what keeps the two from disagreeing: the ordinal the prompt states and the "Sheet N of M"
 * the drawer shows are the same position in the same list, rather than two counts that happen to
 * match.
 *
 * **The prompt calls a batch a *series*, and this module calls it a batch**, because the code
 * already spends `SheetSeries` on the plan axis alone. A reader of the prompt has no use for that
 * distinction — every sheet they have to generate is one of the set — so `describeSeries` flattens
 * both axes into one list.
 */

/** One sheet of a batch: its plan, the facings it draws, and the configuration that produces it. */
export interface BatchSheet {
  /**
   * What is on this sheet, and — through `plan.name` — how the split drawer and the prompt's own
   * series list both title it: `Directional core`, `Articulation`, `Rig pieces`.
   *
   * That name is the half of a label which does not change between facings, and the half that used
   * to have nowhere to live: a row naming only its facing said nothing about what was on it, which
   * was survivable while every batch was one plan repeated and is not once a batch is two different
   * inventories.
   */
  readonly plan: SheetPlan;
  /**
   * The studio configuration for this sheet alone, differing from the one it was split from in its
   * facing, its sheet of the series, or both. Carried so the sheet can be compiled, logged and later
   * restored *as itself* — a history entry holding the batch's configuration would restore to sheet
   * one whatever prompt it shows.
   */
  readonly output: OutputConfig;
  /**
   * Every facing this sheet draws.
   *
   * Carried beside the assembly direction because the two differ for exactly the sheet that made a
   * series necessary: a directional core draws five facings and assembles towards the first of them,
   * so a row labelled with the assembly alone would read identically to the single-facing
   * articulation sheet beneath it and claim the same coverage.
   */
  readonly covered: readonly [Direction, ...Direction[]];
  /** The facing this sheet assembles towards, which fixes its depth order. */
  readonly assembly: Direction;
}

/** Every sheet a configuration asks for, and which of them the configuration itself is. */
export interface SheetBatch {
  /**
   * **Facing-major**, so a batch that splits both ways is worked through one facing at a time rather
   * than one inventory at a time. That is the order the identity lock wants — everything drawn
   * towards one facing is the hardest thing to keep consistent, so it is generated together — and it
   * is also the order that leaves both single-axis batches exactly as they were: a rig over eight
   * facings is its eight sheets in set order, and a two-sheet series on a fixed set is its two
   * sheets in plan order.
   */
  readonly sheets: readonly BatchSheet[];
  /** Which of them the configuration names, counting from one. */
  readonly ordinal: number;
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
 *
 * The category comes with the configuration for the same reason it does everywhere else the sheet's
 * mode is read: the stored mode may be one this category cannot produce, and the axis this counts
 * belongs to the mode the sheet is actually drawn in. It answers the *set* as well, and that is what
 * stops the degenerate batch — an INTERFACE or a TERRAIN can only be drawn `SINGLE_FRONT`, so
 * whatever set the configuration arrived carrying there is one run of it, not three of a button
 * turned to a yaw it does not have.
 */
export function splitsIntoFacingRuns(category: SubjectCategory, output: OutputConfig): boolean {
  return (
    directionSetApplies(category, output) &&
    DIRECTION_LISTS[resolveDirectionSet(category, output.directions)].length > 1
  );
}

/** Every sheet this configuration asks for, and its own position among them. */
export function sheetBatch(category: SubjectCategory, output: OutputConfig): SheetBatch {
  // Both axes asked of the *resolved* pairing — which is now what handing each of them the category
  // means, rather than something this function does on their behalf by resolving once and spreading
  // the answer back over `output`. Counting the facings from the stored mode while counting the
  // sheets from the resolved one would offer eight runs of a mode that draws its own facings and
  // ignores every one of them, giving eight rows with the same prompt.
  const series = sheetSeriesFor(category, output.directionalMode);
  const splits = splitsIntoFacingRuns(category, output);

  // The chosen set where the *resolved* mode reads it as a run list; otherwise the configuration's
  // own single answer, left exactly as it stands so a sheet that ignores the facing is not rewritten
  // by it.
  const facings: readonly (Direction | null)[] = splits
    ? DIRECTION_LISTS[resolveDirectionSet(category, output.directions)]
    : [output.primaryDirection];

  const sheets = facings.flatMap((primaryDirection) =>
    series.map((plan, sheetIndex): BatchSheet => {
      const sheetOutput: OutputConfig = { ...output, primaryDirection, sheetIndex };
      const { covered, assembly } = sheetDirections(category, sheetOutput, plan);
      return { plan, output: sheetOutput, covered, assembly };
    }),
  );

  // Found in the list that was just built rather than computed from the two axes a second time: the
  // flattening order is stated once, in the `flatMap` above, and an ordinal with its own arithmetic
  // for it would disagree the moment that order changed.
  const selectedFacing = splits ? primaryFacing(category, output) : output.primaryDirection;
  const selectedSheet = resolveSheetIndex(category, output.directionalMode, output.sheetIndex);
  const found = sheets.findIndex(
    (sheet) => sheet.output.primaryDirection === selectedFacing && sheet.output.sheetIndex === selectedSheet,
  );

  // Degrades to the first sheet, as every other resolution in this area does, and unreachable for
  // the same reason they are: both halves of the key are resolved through the very lists the entries
  // were built from, so the batch always holds the configuration that produced it.
  return { sheets, ordinal: found < 0 ? 1 : found + 1 };
}

/**
 * How many sheets this configuration is, without compiling any of them.
 *
 * The studio asks this on every keystroke to decide whether to offer the split at all, and compiling
 * a batch of prompts to find out how many there are would be the work the answer exists to avoid.
 */
export function sheetRunCount(category: SubjectCategory, output: OutputConfig): number {
  return sheetBatch(category, output).sheets.length;
}
