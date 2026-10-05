import { iconCatalogueOrder } from '../constants/iconCatalogue/index.ts';
import { ICON_KINDS } from '../types/iconCatalogue.ts';
import type { IconPick } from '../types/iconRoster.ts';
import { iconPickId } from './iconPickId.ts';
import { rosterIcon } from './rosterIcon.ts';

/** Where a pick sorts: its kind's shelf, then the catalogue before the reader's own, then its place. */
type SortKey = readonly [kind: number, custom: number, place: number];

/**
 * A roster's picks in the catalogue's shelving order, each slot name once, with any id the catalogue
 * does not hold left out.
 *
 * **The roster's order is the catalogue's, not the order the reader ticked in.** The series cuts the
 * picks sixteen components to a sheet in this order, so keeping it canonical puts a shelf's icons side
 * by side on one generation — the three healing tiers together, the map pins together — which is what
 * lets the generator hold their family resemblance. It also makes a roster a set: two readers ticking the
 * same icons in a different order get the same sheets, and the same sheet ticks.
 *
 * **The reader's own entries sit at the end of their kind's shelves**, after the last catalogue entry of
 * that kind and before the next kind's first, in the order they were added: a relic the reader wrote
 * shares a sheet with the quest items and containers rather than with the system panels, and adding one
 * never moves the entries before it. Every custom entry of one kind sorts with the same key, so the
 * sort, which is stable, keeps them in the order the input holds them: the order they were added,
 * because every write and every roster read from storage goes through here. Moving a changed entry whose kind changed to the end of its
 * new kind is `withCustomIcon`'s, which appends it rather than replacing it in place.
 */
export function sortIconPicks(picks: readonly IconPick[]): readonly IconPick[] {
  const placed = new Map<string, { readonly pick: IconPick; readonly key: SortKey }>();
  for (const pick of picks) {
    const id = iconPickId(pick);
    const key = sortKey(pick);
    if (key !== undefined && !placed.has(id)) placed.set(id, { pick, key });
  }
  return [...placed.values()].sort((a, b) => compare(a.key, b.key)).map(({ pick }) => pick);
}

function sortKey(pick: IconPick): SortKey | undefined {
  const icon = rosterIcon(pick);
  if (icon === undefined) return undefined;
  const kind = ICON_KINDS.indexOf(icon.kind);
  if (pick.source === 'CUSTOM') return [kind, 1, 0];
  return [kind, 0, iconCatalogueOrder(pick.id) ?? 0];
}

function compare(a: SortKey, b: SortKey): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}
