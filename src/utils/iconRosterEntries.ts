import { iconCatalogueEntry } from '../constants/iconCatalogue/index.ts';
import type { ComponentEntry } from '../types/components.ts';
import type { IconCatalogueEntry } from '../types/iconCatalogue.ts';
import type { SheetSubject } from '../types/subject.ts';
import { iconLookText } from './iconLookText.ts';

/**
 * The inventory lines a subject's icon roster asks for, one per pick, in the roster's order.
 *
 * **Each line is a named slot.** Its `label` is the catalogue id, so the manifest names the cut-out
 * sprite after the icon and the sprite pack writes `heal-minor.png` rather than `core-icon-7.png`; a
 * two-state entry names its two drawings `<id>-<state>` through `parts`. The text opens on the game role
 * and closes on the look this world draws it as, so the generator reads what the icon is *for* before
 * what it looks like.
 *
 * A pick the catalogue does not hold is skipped rather than drawn as a blank: `parseIconRoster` drops
 * stale ids on the way in, so one reaching here came from a caller holding a roster by hand.
 */
export function iconRosterEntries(subject: SheetSubject): readonly ComponentEntry[] {
  return (subject.icons?.picks ?? []).flatMap((id) => {
    const entry = iconCatalogueEntry(id);
    return entry === undefined ? [] : [rosterLine(entry, subject.setting)];
  });
}

function rosterLine(entry: IconCatalogueEntry, world: string): ComponentEntry {
  const look = iconLookText(entry, world);
  if (entry.states === undefined) {
    return { label: entry.id, text: `${entry.role} ×1 — ${look}`, count: 1, kind: 'structure' };
  }
  const [first, second] = entry.states;
  return {
    label: entry.id,
    parts: [`${entry.id}-${first}`, `${entry.id}-${second}`],
    text: `${entry.role} ×2, drawn ${spoken(first)} and then ${spoken(second)} — ${look}`,
    count: 2,
    kind: 'structure',
  };
}

/** A state's slug as the prose says it — `not-ready` is “not ready”. */
function spoken(state: string): string {
  return state.replaceAll('-', ' ');
}
