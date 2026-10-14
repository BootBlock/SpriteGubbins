import type { IconPick, IconRoster } from '../types/iconRoster.ts';
import { sameCustomIcon } from './sameCustomIcon.ts';

/**
 * Whether two rosters ask for the same icons in the same look, colour mode and order — or are both
 * absent.
 *
 * Compared by value, for the reason `samePosition` compares the sixteen fields by value: a preset load
 * hands over a freshly built roster that may hold exactly the picks already in force, and an identity
 * check would record that as a change. An entry of the reader's own is compared field by field, so an
 * edit that changes only its look is a change, and saving it unchanged is not.
 */
export function sameIconRoster(a: IconRoster | undefined, b: IconRoster | undefined): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  return (
    a.look === b.look &&
    a.colourMode === b.colourMode &&
    a.picks.length === b.picks.length &&
    a.picks.every((pick, at) => {
      const other = b.picks[at];
      return other !== undefined && samePick(pick, other);
    })
  );
}

function samePick(a: IconPick, b: IconPick): boolean {
  if (a.source === 'CATALOGUE') return b.source === 'CATALOGUE' && a.id === b.id;
  return b.source === 'CUSTOM' && sameCustomIcon(a.entry, b.entry);
}
