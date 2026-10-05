import { fieldLabelFor } from '../constants/categories/index.ts';
import { PRACTICAL_COMPONENT_CEILING } from '../constants/promptText/inventory.ts';
import { sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import type { AnatomyComponent } from '../types/anatomy.ts';
import type { DirectionalMode } from '../types/output.ts';
import type { DirectionSet } from '../types/rendering.ts';
import type { RigContract } from '../types/rigContract.ts';
import type { SheetSubject, SubjectCategory } from '../types/subject.ts';
import { anatomyFacingsFor, componentCountFor } from './componentSet.ts';
import { planSlots } from './componentSlots.ts';
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
 * **Two things the prompt carries out without a word to the reader.** A piece named like one the sheet
 * already draws is drawn a second time, and its file takes a numbered name (`componentSlots`), so
 * typing `Selected Ring` on an icon set orders a second ring. And pieces enough to push their sheet past
 * `PRACTICAL_COMPONENT_CEILING` were reported only by the budget notice, which speaks for the sheet on
 * screen — and ICON's overlay sheet, where these pieces go, is seldom the one a reader has open.
 *
 * Plain text, because it is shown under the control. Asked of every sheet that draws the pieces, in
 * series order, so a multi-view series names the sheet each finding is about.
 */
export function additionalAnatomyNote(
  category: SubjectCategory,
  subject: SheetSubject,
  additional: readonly AnatomyComponent[],
  { mode, directions, rig }: SeriesCoordinates,
): string {
  if (additional.length === 0) return '';
  const label = fieldLabelFor(category, 'additional_anatomy');
  const sheets = sheetSeriesFor(category, subject, mode, directions).map((_plan, index) => index);
  const sentences = sheets
    .filter((index) => anatomyFacingsFor(category, subject, mode, directions, index) !== null)
    .flatMap((index) => {
      const plan = drawnPlanFor(category, subject, mode, directions, index, rig);
      // A piece answers to the line it repeats as well as to that line's own drawings.
      const lines = plan.groups.flatMap((group) => group.entries.map((entry) => entry.label));
      const drawn = new Set([...planSlots(plan), ...lines]);
      const repeats = additional.filter((piece) => drawn.has(slugify(piece.name))).map((piece) => piece.name);
      const count = componentCountFor(category, subject, mode, directions, index, additional, rig);
      return [
        repeats.length > 0 &&
          `The “${plan.name}” sheet already draws ${spokenList(repeats)}, so ${repeats.length === 1 ? 'it is' : 'each is'} drawn a second time, as a separate file.`,
        count > PRACTICAL_COMPONENT_CEILING &&
          `The pieces in ${label} bring the “${plan.name}” sheet to ${String(count)} components, past the ${String(PRACTICAL_COMPONENT_CEILING)} one generation reliably returns.`,
      ];
    });
  return [...new Set(sentences.filter((sentence) => sentence !== false))].join(' ');
}
