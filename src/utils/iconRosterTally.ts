import {
  iconCatalogueEntry,
  iconCatalogueGroupOf,
  iconComponentCount,
} from '../constants/iconCatalogue/index.ts';
import type { IconKind } from '../types/iconCatalogue.ts';

/** How much of a set a roster fills: its icons, the components they are drawn as, and each kind's share. */
export interface IconRosterTally {
  readonly icons: number;
  /** A two-state entry counts twice, as it does against `ICON_ROSTER_CAPACITY`. */
  readonly components: number;
  /** Icons of each kind, every kind present even at zero. */
  readonly byKind: Readonly<Record<IconKind, number>>;
}

/**
 * Count a roster's picks, skipping any the catalogue does not hold — which `iconRosterEntries` skips too,
 * so the tally and the sheets agree about what the set asks for.
 *
 * The one place the picker's figures are worked out: the studio section's summary, the dialog's footer,
 * the capacity a tick is measured against, and each row's room to be ticked all read it.
 */
export function iconRosterTally(picks: readonly string[]): IconRosterTally {
  const byKind: Record<IconKind, number> = { ITEM: 0, SYSTEM: 0 };
  let icons = 0;
  let components = 0;
  for (const id of picks) {
    const entry = iconCatalogueEntry(id);
    const group = iconCatalogueGroupOf(id);
    if (entry === undefined || group === undefined) continue;
    icons += 1;
    components += iconComponentCount(entry);
    byKind[group.kind] += 1;
  }
  return { icons, components, byKind };
}
