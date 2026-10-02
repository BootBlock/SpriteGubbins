import { customIconShelfLabel } from '../constants/iconCatalogue/customIconShelfLabel.ts';
import type { IconCatalogueFilter, IconKind } from '../types/iconCatalogue.ts';
import { ICON_KINDS } from '../types/iconCatalogue.ts';
import type { CustomIconEntry, IconPick } from '../types/iconRoster.ts';
import { iconFilterMatch } from './iconFilterMatch.ts';

/** The reader's own entries of one kind, as one shelf of the catalogue dialog. */
export interface CustomIconShelf {
  readonly kind: IconKind;
  readonly label: string;
  readonly entries: readonly CustomIconEntry[];
}

/**
 * The reader's own entries as the dialog shelves them: one shelf per kind that holds any, in
 * `ICON_KINDS` order, each in roster order, narrowed by the same search and filters as the catalogue's
 * rows (`iconFilterMatch`). Every one is on the set, so *Ticked only* keeps them all.
 */
export function customIconShelves(
  picks: readonly IconPick[],
  filter: IconCatalogueFilter,
  world: string,
): readonly CustomIconShelf[] {
  const custom = picks.flatMap((pick) => (pick.source === 'CUSTOM' ? [pick.entry] : []));
  return ICON_KINDS.flatMap((kind) => {
    if (filter.kind !== 'ALL' && filter.kind !== kind) return [];
    const label = customIconShelfLabel(kind);
    const entries = custom.filter(
      (entry) => entry.kind === kind && iconFilterMatch(entry, label, true, filter, world),
    );
    return entries.length === 0 ? [] : [{ kind, label, entries }];
  });
}
