import type { IconCatalogueFilter, IconCatalogueGroup } from '../types/iconCatalogue.ts';
import { iconLookText } from './iconLookText.ts';

/**
 * The catalogue narrowed to what the dialog's search and filters ask for, groups in shelving order and
 * entries in their group's order, with any group left empty dropped.
 *
 * **The search reads what the reader can see**: an entry's role, its id (the slot and file name), the
 * look it is drawn as in `world` — through `iconLookText`, which is what the sheet's inventory line
 * says, so a search for “injector” finds the cyberpunk healing tiers and not the fantasy ones — and its
 * group's label. Every word typed has to match somewhere in that text, in any case, so adding a word
 * narrows the list rather than widening it.
 */
export function iconCatalogueSearch(
  groups: readonly IconCatalogueGroup[],
  filter: IconCatalogueFilter,
  picks: readonly string[],
  world: string,
): readonly IconCatalogueGroup[] {
  const words = filter.query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word !== '');
  const ticked = new Set(picks);
  return groups.flatMap((group) => {
    if (filter.kind !== 'ALL' && group.kind !== filter.kind) return [];
    const entries = group.entries.filter((entry) => {
      if (filter.tickedOnly && !ticked.has(entry.id)) return false;
      const text = [entry.role, entry.id, iconLookText(entry, world), group.label].join(' ').toLowerCase();
      return words.every((word) => text.includes(word));
    });
    return entries.length === 0 ? [] : [{ ...group, entries }];
  });
}
