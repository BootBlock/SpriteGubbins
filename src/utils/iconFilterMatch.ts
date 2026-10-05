import type { IconCatalogueFilter } from '../types/iconCatalogue.ts';
import type { IconEntry } from '../types/iconRoster.ts';
import { iconLookText } from './iconLookText.ts';

/**
 * Whether one row of the catalogue dialog survives its search and filters — a catalogue entry or one
 * of the reader's own, judged alike.
 *
 * **The search reads what the reader can see**: the entry's role, its id (the slot and file name), the
 * look it is drawn as in `world` — through `iconLookText`, which is what the sheet's inventory line says,
 * so a search for “injector” finds the cyberpunk healing tiers and not the fantasy ones — and the label
 * of the shelf it sits on. Every word typed has to start a word of that text, in any case, so adding a
 * word narrows the list rather than widening it. A spell's look text closes on its school's name in
 * `world`, so a search for “frost” finds the cryo school in a fantasy world.
 *
 * **A word is matched from its start**, not anywhere inside it: a search for “ping” once showed
 * seventeen shelves, from sweeping and whipping to shopping, beside the one shelf of pings. Words are
 * split at anything that is not a letter or a digit, the typed words as the text is, so a slot name
 * typed with its hyphens (`heal-minor`) still finds its entry.
 *
 * **The school filter keeps only the entries of one school**, which are spells alone; the dialog offers
 * it only while the kind is `SPELL`, so it never narrows a shelf the reader cannot see it narrowing. The
 * kind filter is the caller's, since it drops whole shelves.
 */
export function iconFilterMatch(
  entry: IconEntry,
  shelf: string,
  ticked: boolean,
  filter: IconCatalogueFilter,
  world: string,
): boolean {
  if (filter.tickedOnly && !ticked) return false;
  if (filter.school !== 'ALL' && entry.school !== filter.school) return false;
  const words = wordsOf([entry.role, entry.id, iconLookText(entry, world), shelf].join(' '));
  return wordsOf(filter.query).every((typed) => words.some((word) => word.startsWith(typed)));
}

/** The words of `text` in lower case, split at anything that is not a letter or a digit. */
function wordsOf(text: string): readonly string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word !== '');
}
