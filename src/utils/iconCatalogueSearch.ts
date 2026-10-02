import type { IconCatalogueFilter, IconCatalogueGroup } from '../types/iconCatalogue.ts';
import type { IconPick } from '../types/iconRoster.ts';
import { iconFilterMatch } from './iconFilterMatch.ts';

/**
 * The catalogue narrowed to what the dialog's search and filters ask for, groups in shelving order and
 * entries in their group's order, with any group left empty dropped. What a row has to match is
 * `iconFilterMatch`'s, which the reader's own entries are judged by too (`customIconShelves`).
 */
export function iconCatalogueSearch(
  groups: readonly IconCatalogueGroup[],
  filter: IconCatalogueFilter,
  picks: readonly IconPick[],
  world: string,
): readonly IconCatalogueGroup[] {
  const ticked = new Set(picks.flatMap((pick) => (pick.source === 'CATALOGUE' ? [pick.id] : [])));
  return groups.flatMap((group) => {
    if (filter.kind !== 'ALL' && group.kind !== filter.kind) return [];
    const entries = group.entries.filter((entry) =>
      iconFilterMatch(entry, group.label, ticked.has(entry.id), filter, world),
    );
    return entries.length === 0 ? [] : [{ ...group, entries }];
  });
}
