import { iconComponentCount } from '../constants/iconCatalogue/index.ts';
import type { ComponentEntry } from '../types/components.ts';
import type { IconEntry } from '../types/iconRoster.ts';
import type { SheetSubject } from '../types/subject.ts';
import { iconLookText } from './iconLookText.ts';
import { iconSlotNames } from './iconSlotNames.ts';
import { rosterIcon } from './rosterIcon.ts';
import { spokenIconState } from './spokenIconState.ts';

/**
 * The inventory lines a subject's icon roster asks for, one per pick, in the roster's order.
 *
 * **Each line is a named slot.** Its `label` is the entry's id, so the manifest names the cut-out
 * sprite after the icon and the sprite pack writes `heal-minor.png` rather than `core-icon-7.png`; a
 * two-state entry names its two drawings `<id>-<state>` through `parts`. The text opens on the game role
 * and closes on the look this world draws it as, so the generator reads what the icon is *for* before
 * what it looks like.
 *
 * **An entry of the reader's own is written by the same line**, so its role, school, pair wording and
 * slot reach the prompt exactly as a catalogue entry's do; only its look comes from the reader.
 *
 * A pick the catalogue does not hold is skipped rather than drawn as a blank: `parseIconRoster` drops
 * stale ids on the way in, so one reaching here came from a caller holding a roster by hand.
 */
export function iconRosterEntries(subject: SheetSubject): readonly ComponentEntry[] {
  return (subject.icons?.picks ?? []).flatMap((pick) => {
    const icon = rosterIcon(pick);
    return icon === undefined ? [] : [rosterLine(icon.entry, subject.setting)];
  });
}

function rosterLine(entry: IconEntry, world: string): ComponentEntry {
  const look = iconLookText(entry, world);
  if (entry.states === undefined) {
    return {
      label: entry.id,
      text: `${entry.role} ×1 — ${look}`,
      count: iconComponentCount(entry),
      kind: 'structure',
    };
  }
  const [first, second] = entry.states;
  const count = iconComponentCount(entry);
  return {
    label: entry.id,
    parts: iconSlotNames(entry),
    text: `${entry.role} ×${String(count)}, one icon drawn ${spokenIconState(first)} and then ${spokenIconState(second)} — ${look}`,
    count,
    kind: 'structure',
  };
}
