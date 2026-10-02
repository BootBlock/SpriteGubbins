import { iconCatalogueEntry, iconCatalogueGroupOf } from '../constants/iconCatalogue/index.ts';
import type { IconKind } from '../types/iconCatalogue.ts';
import type { IconEntry, IconPick } from '../types/iconRoster.ts';

/** A pick resolved to what it draws, and the kind of shelf it is counted and ordered under. */
export interface RosterIcon {
  readonly entry: IconEntry;
  readonly kind: IconKind;
  /** Whether the reader wrote it, rather than ticking it from the catalogue. */
  readonly custom: boolean;
}

/**
 * What one pick draws: the catalogue entry its id names, filed under its group's kind, or the reader's
 * own entry, filed under the kind it declares.
 *
 * `undefined` for a catalogue id this build does not hold, which `parseIconRoster` drops on the way in;
 * one reaching here came from a caller holding a roster by hand, and every reader skips it alike, so the
 * sheets, the tally and the order agree about what the set asks for.
 */
export function rosterIcon(pick: IconPick): RosterIcon | undefined {
  if (pick.source === 'CUSTOM') return { entry: pick.entry, kind: pick.entry.kind, custom: true };
  const entry = iconCatalogueEntry(pick.id);
  const group = iconCatalogueGroupOf(pick.id);
  return entry === undefined || group === undefined ? undefined : { entry, kind: group.kind, custom: false };
}
