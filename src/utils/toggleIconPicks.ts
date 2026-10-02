import {
  iconCatalogueEntry,
  iconCatalogueOrder,
  iconComponentCount,
} from '../constants/iconCatalogue/index.ts';
import type { IconPick } from '../types/iconRoster.ts';
import { iconRosterTally } from './iconRosterTally.ts';
import { sortIconPicks } from './sortIconPicks.ts';

/** A roster's picks after a tick or an untick, and the ids a tick could not fit. */
export interface IconPickToggle {
  readonly picks: readonly IconPick[];
  /** Ids asked for and left unticked because the set had no room for them, in catalogue order. */
  readonly refused: readonly string[];
}

/**
 * Tick or untick catalogue entries on a roster, keeping it in shelving order and inside `capacity`
 * components.
 *
 * **A tick past capacity is refused, not truncated silently.** The ids are taken in catalogue order and
 * each is ticked if its components still fit, so a group ticked into a nearly full set takes what fits
 * and reports the rest in `refused` for the caller to tell the reader about. It skips rather than stops
 * at the first that does not fit, because a two-state entry can be refused where a one-component entry
 * after it still fits.
 *
 * **Only catalogue picks are touched.** An entry of the reader's own is never named by a catalogue id,
 * so it is neither ticked nor unticked here; it leaves a roster through `removeCustomIcon` alone. An id
 * the catalogue does not hold is ignored either way, as `parseIconRoster` ignores one in storage.
 */
export function toggleIconPicks(
  picks: readonly IconPick[],
  ids: readonly string[],
  on: boolean,
  capacity: number,
): IconPickToggle {
  if (!on) {
    const removed = new Set(ids);
    const kept = picks.filter((pick) => pick.source === 'CUSTOM' || !removed.has(pick.id));
    return { picks: sortIconPicks(kept), refused: [] };
  }

  const kept = [...picks];
  const held = new Set(picks.flatMap((pick) => (pick.source === 'CATALOGUE' ? [pick.id] : [])));
  const refused: string[] = [];
  let filled = iconRosterTally(picks).components;
  for (const id of inCatalogueOrder(ids)) {
    const entry = iconCatalogueEntry(id);
    if (entry === undefined || held.has(id)) continue;
    const count = iconComponentCount(entry);
    if (filled + count > capacity) {
      refused.push(id);
      continue;
    }
    kept.push({ source: 'CATALOGUE', id });
    held.add(id);
    filled += count;
  }
  return { picks: sortIconPicks(kept), refused };
}

/** The ids the catalogue holds, each once, in its shelving order. */
function inCatalogueOrder(ids: readonly string[]): readonly string[] {
  return [...new Set(ids)]
    .flatMap((id) => {
      const at = iconCatalogueOrder(id);
      return at === undefined ? [] : [{ id, at }];
    })
    .sort((a, b) => a.at - b.at)
    .map(({ id }) => id);
}
