import { modesFor } from '../sheetPlans/index.ts';
import { batchComponentCount } from '../../utils/componentSet.ts';
import { sheetBatch } from '../../utils/sheetBatch.ts';
import type { AnatomyComponent } from '../../types/anatomy.ts';
import type { DirectionalMode, OutputConfig } from '../../types/output.ts';
import type { SubjectCategory } from '../../types/subject.ts';
import type { OutputChoice } from './choices.ts';

/**
 * How each mode is labelled for a category, with the count that pairing would actually ask for.
 *
 * **Scoped to the category**, which is the studio half of the contamination fix: the selector used
 * to offer all four modes to everything, so `TILESET_MODULAR` was one click away from any character
 * and the sheet it produced was floors and walls. A mode the category has no plan for is not
 * rendered, so the mismatch cannot be selected in the first place.
 *
 * A function rather than a constant because the count is a property of neither axis alone: the
 * category and mode choose the plans, the direction set multiplies the ones drawn a facing at a
 * time, and a subject naming additional anatomy adds to every sheet that draws the body. It
 * enumerates the batch through `sheetBatch` and sums it through `batchComponentCount`, so this
 * really is another *reader* of the one arithmetic rather than a second implementation — a label
 * that disagrees with the prompt is how a user comes to expect the wrong number of components.
 *
 * **The figure is the whole batch — every generation the pairing takes, not every part of its
 * inventory.** This label is how a user chooses what to generate, so the number they are choosing by
 * has to be what the pairing actually costs them. It used to state the inventory axis alone, and
 * that is the half of a reported failure the studio could be blamed for: a CHARACTER's directional
 * pairing over the five classic facings advertised "49 across 2 sheets", then produced a batch of
 * six — the trunk once, and the limbs at each of the five facings, because a front-facing arm
 * cannot hang on a back-facing body. A reader who chose by that label had every reason to think the
 * six were six of something they had not asked for. The word `sheets` means a generation here, as it
 * does in `SheetProgress`, in the split drawer and in the compiled prompt's own section 6.
 *
 * It takes the whole configuration rather than a direction set because a batch is a property of one:
 * `sheetBatch` is the single place the run expansion is written down, and reproducing it from the
 * set alone would be the second implementation this file exists to avoid. Only the mode varies here,
 * so each candidate is the studio's own configuration with that one field moved.
 *
 * The per-sheet figure is what the budget notice, the inventory heading and the atlas grid state,
 * because each of those describes one image.
 */
export function directionalModeChoices(
  category: SubjectCategory,
  output: OutputConfig,
  clothing: string,
  additional: readonly AnatomyComponent[],
): readonly OutputChoice<DirectionalMode>[] {
  return modesFor(category).map((mode) => {
    const { sheets: batch } = sheetBatch(category, { ...output, directionalMode: mode });
    const sheets = batch.length;
    const total = String(batchComponentCount(category, batch, clothing, additional));
    // The unit gives way to the sheet count rather than joining it: `SINGLE_DIRECTION_POSE_LIBRARY`
    // leaves 18 characters inside its parenthesis against this file's 50-character budget, and a
    // four-digit total with both spelled out is 27. Which one to drop is not a close call — that a
    // pairing is eight generations is the fact a user is choosing by, and that the figures count
    // components is what every other number in the panel already means.
    //
    // `in` rather than `across`, which is what it said while the figure was the inventory axis: the
    // batch is the larger of the two counts on both sides of the parenthesis, and the longest
    // identifier at eight generations of a four-digit total is 48 characters with the shorter word
    // and 52 with the longer one.
    const detail =
      sheets > 1 ? `in ${String(sheets)} sheets` : mode === 'TILESET_MODULAR' ? 'tiles' : 'components';
    return { value: mode, label: `${mode} (${total} ${detail})` };
  });
}
