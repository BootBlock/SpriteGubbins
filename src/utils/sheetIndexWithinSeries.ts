import { sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import type { OutputConfig } from '../types/output.ts';
import type { SheetSubject, SubjectCategory } from '../types/subject.ts';

/**
 * The output with its sheet index pulled back inside the subject's series, or the same object where it
 * already is.
 *
 * **Clamped to the last sheet rather than reset to the first**, which is where it differs from
 * `resolveOutputForSubject`. That one answers a change of *what* is drawn, where sheet three of the old
 * series means nothing in the new one. This answers a roster shrinking under a reader who is part-way
 * through it: unticking the icons on sheet four of four leaves them nearest the sheet they were on, and
 * the sheets before it are the ones they have already generated.
 *
 * Returned by identity where nothing moves, so the store writes nothing for a tick that leaves the
 * index alone.
 */
export function sheetIndexWithinSeries(
  category: SubjectCategory,
  subject: SheetSubject,
  output: OutputConfig,
): OutputConfig {
  const { length } = sheetSeriesFor(category, subject, output.directionalMode, output.directions);
  const last = Math.max(0, length - 1);
  return output.sheetIndex > last ? { ...output, sheetIndex: last } : output;
}
