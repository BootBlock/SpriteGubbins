import { useMemo } from 'react';
import { sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import { useOutputStore } from '../stores/useOutputStore.ts';
import { useSubjectStore } from '../stores/useSubjectStore.ts';
import { iconRosterSummary } from '../utils/iconRosterSummary.ts';
import type { IconRosterSummary } from '../utils/iconRosterSummary.ts';
import { iconRosterTally } from '../utils/iconRosterTally.ts';
import type { IconRosterTally } from '../utils/iconRosterTally.ts';
import { useSheetSubject } from './useSheetSubject.ts';

/** The roster's figures, and the words the picker shows them in. */
export interface IconRosterReading {
  readonly tally: IconRosterTally;
  readonly summary: IconRosterSummary;
}

/**
 * The studio's icon roster counted and described, or `null` for a subject with no roster.
 *
 * **The sheet count is the series the compiler draws** — `sheetSeriesFor` over the subject and the
 * output's own mode and directions — so the summary under the studio section and in the catalogue's
 * footer is the same number the sheet list offers, however the even cut lays out the two-state pairs.
 * One derivation for both surfaces, because two would be two answers to how many sheets a set is.
 */
export function useIconRosterSummary(): IconRosterReading | null {
  const category = useSubjectStore((state) => state.category);
  const subject = useSheetSubject();
  const directionalMode = useOutputStore((state) => state.output.directionalMode);
  const directions = useOutputStore((state) => state.output.directions);

  return useMemo(() => {
    if (subject.icons === undefined) return null;
    const tally = iconRosterTally(subject.icons.picks);
    const sheets = sheetSeriesFor(category, subject, directionalMode, directions).length;
    return { tally, summary: iconRosterSummary(tally, sheets) };
  }, [category, subject, directionalMode, directions]);
}
