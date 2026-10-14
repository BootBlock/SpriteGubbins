import { iconComponentCount } from '../constants/iconCatalogue/index.ts';
import type { IconKind } from '../types/iconCatalogue.ts';
import type { IconPick } from '../types/iconRoster.ts';
import { rosterIcon } from './rosterIcon.ts';

/** How much of a set a roster fills: its icons, the components they are drawn as, and each kind's share. */
export interface IconRosterTally {
  readonly icons: number;
  /** A two-state entry counts twice, as it does against `ICON_ROSTER_CAPACITY`. */
  readonly components: number;
  /** Icons of each kind, every kind present even at zero; the reader's own count under their kind. */
  readonly byKind: Readonly<Record<IconKind, number>>;
  /** How many of the icons are entries the reader wrote. */
  readonly custom: number;
}

/**
 * Count a roster's picks, skipping any the catalogue does not hold — which `iconRosterEntries` skips too,
 * so the tally and the sheets agree about what the set asks for. An entry of the reader's own counts
 * against the capacity and under its kind exactly as a catalogue entry does.
 *
 * The one place the picker's figures are worked out: the studio section's summary, the dialog's footer,
 * the capacity a tick is measured against, and each row's room to be ticked all read it.
 */
export function iconRosterTally(picks: readonly IconPick[]): IconRosterTally {
  const byKind: Record<IconKind, number> = {
    ITEM: 0,
    SPELL: 0,
    SOCIAL: 0,
    COMPANION: 0,
    PROFESSION: 0,
    SYSTEM: 0,
  };
  let icons = 0;
  let components = 0;
  let custom = 0;
  for (const pick of picks) {
    const icon = rosterIcon(pick);
    if (icon === undefined) continue;
    icons += 1;
    components += iconComponentCount(icon.entry);
    byKind[icon.kind] += 1;
    if (icon.custom) custom += 1;
  }
  return { icons, components, byKind, custom };
}
