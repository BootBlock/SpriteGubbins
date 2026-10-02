import type { CustomIconEntry, IconPick } from '../types/iconRoster.ts';
import { iconPickId } from './iconPickId.ts';
import { sortIconPicks } from './sortIconPicks.ts';

/**
 * A roster's picks with an entry of the reader's own added, or put in place of the pick `replacing`
 * names, in shelving order.
 *
 * **Replaced in place, then sorted**, so a changed entry keeps its position among the reader's own of
 * its kind, and one whose kind changed moves to the end of its new kind's shelves. The entry is taken as
 * `checkCustomIcon` passed it; this checks nothing.
 */
export function withCustomIcon(
  picks: readonly IconPick[],
  entry: CustomIconEntry,
  replacing: string | null,
): readonly IconPick[] {
  const pick: IconPick = { source: 'CUSTOM', entry };
  return sortIconPicks(
    replacing === null
      ? [...picks, pick]
      : picks.map((held) => (iconPickId(held) === replacing ? pick : held)),
  );
}
