import { fieldLabelFor } from '../constants/categories/index.ts';
import { PRACTICAL_COMPONENT_CEILING } from '../constants/promptText/inventory.ts';
import { sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import type { AnatomyComponent } from '../types/anatomy.ts';
import type { SheetPlan } from '../types/components.ts';
import type { DirectionalMode } from '../types/output.ts';
import type { DirectionSet } from '../types/rendering.ts';
import type { RigContract } from '../types/rigContract.ts';
import type { SheetSubject, SubjectCategory } from '../types/subject.ts';
import { componentCountFor } from './componentSet.ts';
import { planSlots } from './componentSlots.ts';
import { drawsAdditionalAnatomy } from './drawsAdditionalAnatomy.ts';
import { spellNumber } from './numberWords.ts';
import { drawnPlanFor } from './sheetPlanAbsence.ts';
import { slugify } from './slugify.ts';
import { spokenList } from './spokenList.ts';

/** The sheet a configuration's series is drawn from, as `componentCountFor` takes it. */
interface SeriesCoordinates {
  readonly mode: DirectionalMode;
  readonly directions: DirectionSet;
  readonly rig: RigContract | null;
}

/**
 * What the additional-anatomy field says under itself, or `''` where its pieces sit well on the sheets
 * that draw them (audit finding T8).
 *
 * **Three things the prompt carries out without a word to the reader.** A piece named like one the
 * series already draws is drawn a second time, as a separate file (`componentSlots`, and
 * `iconOverlaySheets` across the overlay sheets), so typing `Selected Ring` on an icon set orders a
 * second ring. Pieces enough to push their sheet past `PRACTICAL_COMPONENT_CEILING` were reported only by
 * the budget notice, which speaks for the sheet on screen — and ICON's overlay sheets, where these pieces
 * go, are seldom the one a reader has open. And on an icon set, pieces past the sixteen cells of one
 * overlay sheet add another to the series, which changes how many prompts the set takes.
 *
 * **A sheet draws the pieces two ways** (`drawsAdditionalAnatomy`): appended after its inventory, or
 * listed in a group of its own, as ICON's overlay sheets do. A repeat is looked for
 * on every sheet that shares an assembly sentence with one that draws them, because ICON's overlay
 * library is cut across its overlay sheets, and a piece on the second repeats a line on the first.
 *
 * Plain text, because it is shown under the control. Asked of the sheets in series order, so a
 * multi-view series names the sheet each finding is about.
 */
export function additionalAnatomyNote(
  category: SubjectCategory,
  subject: SheetSubject,
  additional: readonly AnatomyComponent[],
  { mode, directions, rig }: SeriesCoordinates,
): string {
  if (additional.length === 0) return '';
  const label = fieldLabelFor(category, 'additional_anatomy');
  const series = sheetSeriesFor(category, subject, mode, directions);
  const plans = series.map((_plan, index) => drawnPlanFor(category, subject, mode, directions, index, rig));
  const carrying = plans.flatMap((_plan, index) =>
    drawsAdditionalAnatomy(category, subject, mode, directions, index) ? [index] : [],
  );
  const libraries = new Set(carrying.map((index) => plans[index]?.assembly));

  const repeated = plans
    .filter((plan) => libraries.has(plan.assembly))
    .map((plan) => {
      const drawn = drawnBy(plan);
      const repeats = additional.filter((piece) => drawn.has(slugify(piece.name))).map((piece) => piece.name);
      return (
        repeats.length > 0 &&
        `The “${plan.name}” sheet already draws ${spokenList(repeats)}, so ${repeats.length === 1 ? 'it is' : 'each is'} drawn a second time, as a separate file.`
      );
    });
  const crowded = carrying.map((index) => {
    const count = componentCountFor(category, subject, mode, directions, index, additional, rig);
    return (
      count > PRACTICAL_COMPONENT_CEILING &&
      `The pieces in ${label} bring the “${plans[index]?.name ?? ''}” sheet to ${String(count)} components, past the ${String(PRACTICAL_COMPONENT_CEILING)} one generation reliably returns.`
    );
  });
  const added =
    series.length - sheetSeriesFor(category, { ...subject, additional_anatomy: '' }, mode, directions).length;
  const grown =
    added > 0 &&
    `The pieces in ${label} fill more cells than the sheets without them hold, so they add ${added === 1 ? 'a sheet' : `${spellNumber(added)} sheets`} to the series, and are drawn on ${spokenList(carrying.map((index) => `“${plans[index]?.name ?? ''}”`))}.`;

  return [...new Set([...repeated, ...crowded, grown].filter((sentence) => sentence !== false))].join(' ');
}

/**
 * The names a sheet's own lines answer to, leaving out the reader's pieces: each line's label, and each
 * of that line's drawings.
 */
function drawnBy(plan: SheetPlan): ReadonlySet<string> {
  const own = { ...plan, groups: plan.groups.filter((group) => group.additional !== true) };
  const lines = own.groups.flatMap((group) => group.entries.map((entry) => entry.label));
  return new Set([...planSlots(own), ...lines]);
}
