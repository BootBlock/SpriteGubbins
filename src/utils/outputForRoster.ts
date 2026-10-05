import { resolveBackgroundKey } from '../constants/backgroundKeysFor.ts';
import { resolvePalette } from '../constants/palettesFor.ts';
import { sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import type { OutputConfig } from '../types/output.ts';
import type { SheetSubject, SubjectCategory } from '../types/subject.ts';

/**
 * The output a changed roster leaves behind: its sheet index pulled back inside the subject's series,
 * and its background key and palette moved to ones the set can take — or the same object where none
 * moves.
 *
 * **The index is clamped to the last sheet rather than reset to the first**, which is where it differs
 * from `resolveOutputForSubject`. That one answers a change of *what* is drawn, where sheet three of the
 * old series means nothing in the new one. This answers a roster shrinking under a reader who is
 * part-way through it: unticking the icons on sheet four of four leaves them nearest the sheet they were
 * on, and the sheets before it are the ones they have already generated.
 *
 * **The key moves only off `PURE_WHITE`, and the palette only onto `FREE`, and both only under a tint
 * mask** (`resolveBackgroundKey`, `resolvePalette`, audit finding M1), so choosing the mode settles both
 * in the same act and an undo restores all three.
 *
 * Returned by identity where nothing moves, so the store writes nothing for a tick that leaves all
 * three alone.
 */
export function outputForRoster(
  category: SubjectCategory,
  subject: SheetSubject,
  output: OutputConfig,
): OutputConfig {
  const { length } = sheetSeriesFor(category, subject, output.directionalMode, output.directions);
  const sheetIndex = Math.min(output.sheetIndex, Math.max(0, length - 1));
  const backgroundKey = resolveBackgroundKey(subject, output.targetModel, output.backgroundKey);
  const palette = resolvePalette(subject, output.palette);
  if (
    sheetIndex === output.sheetIndex &&
    backgroundKey === output.backgroundKey &&
    palette === output.palette
  ) {
    return output;
  }
  return { ...output, sheetIndex, backgroundKey, palette };
}
