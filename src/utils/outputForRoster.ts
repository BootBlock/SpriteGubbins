import { resolveBackgroundKey } from '../constants/backgroundKeysFor.ts';
import { resolvePalette } from '../constants/palettesFor.ts';
import { resolveSheetIndex, sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import type { SheetSeries } from '../types/components.ts';
import type { OutputConfig } from '../types/output.ts';
import type { SheetSubject, SubjectCategory } from '../types/subject.ts';
import { overlaySheetCount } from './overlaySheetCount.ts';

/**
 * The output a changed roster leaves behind: its sheet index kept on the same sheet of the subject's new
 * series, and its background key and palette moved to ones the set can take — or the same object where
 * none moves.
 *
 * **An overlay sheet stays the same overlay sheet.** The overlay sheets close the series (audit finding
 * T6), and a roster change leaves how many there are alone, since only the *Extra Overlay Pieces* add
 * one. So a reader who chose the second overlay sheet is moved to the new series' second overlay sheet
 * whatever the roster now holds, and a reader on an icon sheet is kept among the icon sheets: a tick that
 * adds a sheet would otherwise carry the first reader onto another sheet by position, and an untick that
 * removes one would carry the second onto an overlay sheet. A set with no icons is the overlay sheets
 * alone, which the reader is on because there is nothing else, so their first ticks take them to the
 * first icon sheet. The overlay sheets are counted by `overlaySheetCount`.
 *
 * **An icon sheet is clamped to the last icon sheet rather than reset to the first**, which is where it
 * differs from `resolveOutputForSubject`. That one answers a change of *what* is drawn, where sheet three
 * of the old series means nothing in the new one. This answers a roster shrinking under a reader who is
 * part-way through it: unticking the icons on the fourth icon sheet of four leaves them on the nearest
 * icon sheet, and the sheets before it are the ones they have already generated. A roster emptied to
 * nothing is the overlay sheets alone, and they land on the first.
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
  const was = iconSheetsOf(sheetSeriesFor(category, before, directionalMode, directions));
  const now = sheetSeriesFor(category, after, directionalMode, directions);
  const icons = iconSheetsOf(now);
  const held = resolveSheetIndex(category, before, directionalMode, directions, output.sheetIndex);
  const sheetIndex =
    was === 0
      ? 0
      : held >= was
        ? Math.min(icons + held - was, now.length - 1)
        : Math.min(held, Math.max(0, icons - 1));
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

/** How many sheets of a series are icon sheets: those before the overlay sheets that close it. */
function iconSheetsOf(series: SheetSeries): number {
  return series.length - overlaySheetCount(series);
}
