import { customIconShelfLabel } from '../constants/iconCatalogue/customIconShelfLabel.ts';
import type { IconCatalogueFilter, IconKind } from '../types/iconCatalogue.ts';
import { ICON_KINDS } from '../types/iconCatalogue.ts';
import type { CustomIconEntry, IconPick } from '../types/iconRoster.ts';
import type { SavedCustomIcon } from '../types/savedCustomIcon.ts';
import { iconFilterMatch } from './iconFilterMatch.ts';
import { sameCustomIcon } from './sameCustomIcon.ts';

/** One slot of the reader's own, as a row of the catalogue dialog. */
export interface CustomIconShelfRow {
  /** The set's copy where the slot is ticked, since that is what the sheets draw; the library's otherwise. */
  readonly entry: CustomIconEntry;
  readonly ticked: boolean;
  /** The project's library row under this slot, or `undefined` where the set alone holds it. */
  readonly saved: SavedCustomIcon | undefined;
  /** Whether the set's copy is not the library's copy of the same slot. */
  readonly differs: boolean;
}

/** The reader's own rows of one kind, as one shelf of the catalogue dialog. */
export interface CustomIconShelf {
  readonly kind: IconKind;
  readonly label: string;
  readonly rows: readonly CustomIconShelfRow[];
}

/**
 * The reader's own entries as the dialog shelves them: every one the set holds and every one in the
 * project's library, one row per slot, ticked where the set holds it.
 *
 * **A slot the set and the library both hold is one row**, since it is one sprite either way; the row
 * shows the set's copy and says where the library's has moved on (`differs`). A slot only the set
 * holds — loaded from another project's preset, or deleted from the library — is a row too, so it can
 * still be unticked, edited or kept.
 *
 * One shelf per kind that holds any, in `ICON_KINDS` order, narrowed by the same search and filters
 * as the catalogue's rows (`iconFilterMatch`), *Ticked only* included. **Rows are in role order**, not
 * in the order the sheets draw them: a library grows across many sets, a reader finds an entry by its
 * name, and a row must not move under the pointer as it is ticked and unticked.
 */
export function customIconShelves(
  picks: readonly IconPick[],
  library: readonly SavedCustomIcon[],
  filter: IconCatalogueFilter,
  world: string,
): readonly CustomIconShelf[] {
  const onSet = picks.flatMap((pick) => (pick.source === 'CUSTOM' ? [pick.entry] : []));
  const rows: CustomIconShelfRow[] = [
    ...onSet.map((entry) => {
      const saved = library.find((icon) => icon.entry.id === entry.id);
      return {
        entry,
        ticked: true,
        saved,
        differs: saved !== undefined && !sameCustomIcon(saved.entry, entry),
      };
    }),
    ...library
      .filter((icon) => !onSet.some((entry) => entry.id === icon.entry.id))
      .map((saved) => ({ entry: saved.entry, ticked: false, saved, differs: false })),
  ].sort(
    (a, b) =>
      a.entry.role.localeCompare(b.entry.role, 'en-GB', { sensitivity: 'base' }) ||
      a.entry.id.localeCompare(b.entry.id),
  );

  return ICON_KINDS.flatMap((kind) => {
    if (filter.kind !== 'ALL' && filter.kind !== kind) return [];
    const label = customIconShelfLabel(kind);
    const shown = rows.filter(
      (row) => row.entry.kind === kind && iconFilterMatch(row.entry, label, row.ticked, filter, world),
    );
    return shown.length === 0 ? [] : [{ kind, label, rows: shown }];
  });
}
