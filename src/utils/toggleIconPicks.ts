import { iconCatalogueEntry, iconComponentCount } from '../constants/iconCatalogue/index.ts';
import { iconRosterTally } from './iconRosterTally.ts';
import { sortIconPicks } from './sortIconPicks.ts';

/** A roster's picks after a tick or an untick, and the ids a tick could not fit. */
export interface IconPickToggle {
  readonly picks: readonly string[];
  /** Ids asked for and left unticked because the set had no room for them, in catalogue order. */
  readonly refused: readonly string[];
}

/**
 * Tick or untick catalogue entries on a roster, keeping it in catalogue order and inside `capacity`
 * components.
 *
 * **A tick past capacity is refused, not truncated silently.** The ids are taken in catalogue order and
 * each is ticked if its components still fit, so a group ticked into a nearly full set takes what fits
 * and reports the rest in `refused` for the caller to tell the reader about. It skips rather than stops
 * at the first that does not fit, because a two-state entry can be refused where a one-component entry
 * after it still fits.
 *
 * An id the catalogue does not hold is ignored either way, as `parseIconRoster` ignores one in storage.
 */
export function toggleIconPicks(
  picks: readonly string[],
  ids: readonly string[],
  on: boolean,
  capacity: number,
): IconPickToggle {
  if (!on) {
    const removed = new Set(ids);
    return { picks: sortIconPicks(picks.filter((id) => !removed.has(id))), refused: [] };
  }

  const kept = [...picks];
  const refused: string[] = [];
  let filled = iconRosterTally(picks).components;
  for (const id of sortIconPicks(ids)) {
    const entry = iconCatalogueEntry(id);
    if (entry === undefined || kept.includes(id)) continue;
    const count = iconComponentCount(entry);
    if (filled + count > capacity) {
      refused.push(id);
      continue;
    }
    kept.push(id);
    filled += count;
  }
  return { picks: sortIconPicks(kept), refused };
}
