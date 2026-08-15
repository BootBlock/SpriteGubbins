import type { AnatomyComponent } from '../types/anatomy.ts';
import type { SubjectCategory } from '../types/subject.ts';
import { sheetComponentCount } from './componentSet.ts';
import type { SheetBatch } from './sheetBatch.ts';

/**
 * The batch as the assembly-capability section lists it: one line per sheet, saying what it carries,
 * how many components are on it and which facings it draws — with this one marked.
 *
 * **The per-sheet counts are the point of it.** Section 0 ranks the component count and the
 * inventory above everything else, so a sheet out of a batch has to be told that the number it
 * contracts for is its own; a list where every sheet states its own figure says that without asking
 * the reader to take it on trust. The facings do the other half of the same job — a sheet that can
 * see which facings the others cover has no reason to draw them itself, which is the failure this
 * list exists to prevent: a run quietly adding the pieces it can see are missing.
 *
 * The counts come from `sheetComponentCount` rather than being summed here, which is what makes the
 * figure a row states and the batch total the split drawer states one arithmetic over one run list.
 *
 * Prompt prose, and it still lives in `src/utils/` rather than beside `describeDirections` and
 * `describePalette` in `constants/promptText/`, because unlike those it is a function of the sheet
 * *plans* — it reads a batch and sums a component count. A constants module reaching into
 * `src/utils/` for that would invert the dependency and close a cycle; `directionalRotation` is
 * filed here for the same reason.
 */
export function describeSeries(
  category: SubjectCategory,
  batch: SheetBatch,
  additional: readonly AnatomyComponent[],
): string {
  return batch.sheets
    .map((sheet, index) => {
      const count = sheetComponentCount(category, sheet, additional);
      const here = index + 1 === batch.ordinal ? ' *(this sheet)*' : '';
      // Named rather than counted where a sheet draws several, since "5 facings" tells the reader
      // nothing about *which* five and therefore nothing about what this sheet may leave alone.
      const facings =
        sheet.covered.length > 1 ? `covering ${sheet.covered.join(', ')}` : `drawn towards ${sheet.assembly}`;

      return `- **Sheet ${String(index + 1)} — ${sheet.plan.name}**${here}: ${String(count)} components, ${facings}.`;
    })
    .join('\n');
}
