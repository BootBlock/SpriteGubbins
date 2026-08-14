import { resolveDirectionSet } from '../constants/categoryDirectionSets.ts';
import { DIRECTION_LISTS } from '../constants/promptText/index.ts';
import { resolveMode, resolveSheetIndex, sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import type { SheetPlan } from '../types/components.ts';
import type { OutputConfig } from '../types/output.ts';
import type { Direction } from '../types/rendering.ts';
import type { SubjectCategory } from '../types/subject.ts';
import { primaryFacing, sheetDirections } from './sheetDirections.ts';

/**
 * The batch one studio configuration is, before a word of it is compiled — and which sheet of that
 * batch the configuration itself names.
 *
 * **A batch is the series with its run sheets expanded.** The series axis is the plan's own: a
 * pairing whose inventory outgrew one generation arrives as more than one sheet, each carrying a
 * different part of it — an eight-compass character is two core sheets and then the articulation.
 * The facing axis belongs to the `'run'` sheets alone: each of those is generated once per facing
 * of the chosen set, so it appears in the batch that many times, while a multi-view sheet appears
 * exactly once — it already carries its facings inside itself. Expanding runs *in series order*
 * keeps the trunk sheets first, which is the order the identity lock wants: the sheets every run
 * has to match are generated before the runs that match them.
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
   * series list both title it: `Directional core — cardinal facings`, `Articulation`, `Rig pieces`.
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
   * series necessary: a directional core draws several facings and assembles towards the first of
   * them, so a row labelled with the assembly alone would read identically to the single-facing
   * articulation sheet beneath it and claim the same coverage.
   */
  readonly covered: readonly [Direction, ...Direction[]];
  /** The facing this sheet assembles towards, which fixes its depth order. */
  readonly assembly: Direction;
}

/** Every sheet a configuration asks for, and which of them the configuration itself is. */
export interface SheetBatch {
  /**
   * **Series-major**: each sheet of the series in plan order, with every `'run'` sheet expanded to
   * one entry per facing of the chosen set in the set's own order. The multi-view core sheets
   * therefore lead the batch, and the runs that must match them follow.
   */
  readonly sheets: readonly BatchSheet[];
  /** Which of them the configuration names, counting from one. */
  readonly ordinal: number;
}

/** Every sheet this configuration asks for, and its own position among them. */
export function sheetBatch(category: SubjectCategory, output: OutputConfig): SheetBatch {
  const mode = resolveMode(category, output.directionalMode);
  const series = sheetSeriesFor(category, mode, output.directions);
  const runFacings = DIRECTION_LISTS[resolveDirectionSet(category, output.directions)];

  const sheets = series.flatMap((plan, sheetIndex): BatchSheet[] => {
    // A run sheet is one generation per facing of the set; anything else is one generation, and its
    // primaryDirection is carried through untouched because nothing in that sheet reads it.
    const facings: readonly (Direction | null)[] =
      plan.facings === 'run' ? runFacings : [output.primaryDirection];
    return facings.map((primaryDirection): BatchSheet => {
      const sheetOutput: OutputConfig = { ...output, primaryDirection, sheetIndex };
      const { covered, assembly } = sheetDirections(category, sheetOutput, plan);
      return { plan, output: sheetOutput, covered, assembly };
    });
  });

  // Found in the list that was just built rather than computed from the two axes a second time: the
  // flattening order is stated once, in the `flatMap` above, and an ordinal with its own arithmetic
  // for it would disagree the moment that order changed. A run sheet is identified by its index and
  // its facing; a multi-view sheet by its index alone, since it appears exactly once.
  const selectedIndex = resolveSheetIndex(category, mode, output.directions, output.sheetIndex);
  const selectedPlan = series[selectedIndex];
  const selectedFacing =
    selectedPlan !== undefined && selectedPlan.facings === 'run' ? primaryFacing(category, output) : null;
  const found = sheets.findIndex(
    (sheet) =>
      sheet.output.sheetIndex === selectedIndex &&
      (selectedFacing === null || sheet.output.primaryDirection === selectedFacing),
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
