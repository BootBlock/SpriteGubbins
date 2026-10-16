import type { CustomIconEntry, IconPick } from '../types/iconRoster.ts';
import { iconPickId } from './iconPickId.ts';
import { sortIconPicks } from './sortIconPicks.ts';

/**
 * A roster's picks with an entry of the reader's own added, or put in place of the pick `replacing`
 * names, in shelving order.
 *
 * **A change that keeps the kind is made in place**, so the entry keeps its position among the reader's
 * own of that kind. **A change of kind moves it to the end of its new kind's shelves**, after every
 * entry of the reader's own already there, as a new entry of that kind would go: the old pick is taken
 * out and the new one appended before the sort, because the sort gives every custom entry of one kind
 * the same key and keeps their input order. The entry is taken as `checkCustomIcon` passed it; this
 * checks nothing.
 */
export function withCustomIcon(
  picks: readonly IconPick[],
  entry: CustomIconEntry,
  replacing: string | null,
): readonly IconPick[] {
  const pick: IconPick = { source: 'CUSTOM', entry };
  const held = picks.find((each) => iconPickId(each) === replacing);
  if (held?.source === 'CUSTOM' && held.entry.kind === entry.kind) {
    return sortIconPicks(picks.map((each) => (each === held ? pick : each)));
  }
  return sortIconPicks([...picks.filter((each) => each !== held), pick]);
}
