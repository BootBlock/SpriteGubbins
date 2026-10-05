import { resolveBackgroundKey } from '../constants/backgroundKeysFor.ts';
import { resolvePalette } from '../constants/palettesFor.ts';
import { resolveSheetIndex, sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import type { OutputConfig } from '../types/output.ts';
import type { SheetSubject, SubjectCategory } from '../types/subject.ts';

/**
 * The output a changed roster leaves behind: its sheet index kept on the same sheet of the subject's new
 * series, and its background key and palette moved to ones the set can take — or the same object where
 * none moves.
 *
 * **The overlay sheet stays the overlay sheet.** It closes the series (audit finding T6), so a reader
 * who chose it from among the icon sheets is moved to the new series' last sheet whatever the roster now
 * holds, and a reader on an icon sheet is kept among the icon sheets: a tick that adds a sheet would
 * otherwise carry the first reader onto an icon sheet by position, and an untick that removes one would
 * carry the second onto the overlay sheet. A set with no icons is the overlay sheet alone, which the
 * reader is on because there is nothing else, so their first ticks take them to the first icon sheet.
 *
 * **An icon sheet is clamped to the last icon sheet rather than reset to the first**, which is where it
 * differs from `resolveOutputForSubject`. That one answers a change of *what* is drawn, where sheet three
 * of the old series means nothing in the new one. This answers a roster shrinking under a reader who is
 * part-way through it: unticking the icons on the fourth icon sheet of four leaves them on the nearest
 * icon sheet, and the sheets before it are the ones they have already generated. A roster emptied to
 * nothing is the overlay sheet alone, which is where they land.
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
  before: SheetSubject,
  after: SheetSubject,
  output: OutputConfig,
): OutputConfig {
  const { directionalMode, directions } = output;
  const was = sheetSeriesFor(category, before, directionalMode, directions).length;
  const { length } = sheetSeriesFor(category, after, directionalMode, directions);
  const held = resolveSheetIndex(category, before, directionalMode, directions, output.sheetIndex);
  const onOverlay = was > 1 && held === was - 1;
  const sheetIndex = onOverlay ? length - 1 : Math.min(held, Math.max(0, length - 2));
  const backgroundKey = resolveBackgroundKey(after, output.targetModel, output.backgroundKey);
  const palette = resolvePalette(after, output.palette);
  if (
    sheetIndex === output.sheetIndex &&
    backgroundKey === output.backgroundKey &&
    palette === output.palette
  ) {
    return output;
  }
  return { ...output, sheetIndex, backgroundKey, palette };
}
