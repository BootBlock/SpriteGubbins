import type { ComponentEntry, SheetFacings } from '../types/components.ts';
import { slugify } from './slugify.ts';

/**
 * One entry's names: its own where it states them, the facing where a sheet draws one per facing,
 * an ordinal where neither applies.
 *
 * **`parts` wins over the facing suffix**, because it is the more specific claim and the only one
 * authored per entry: a line that names its components has said what they are, and deriving a facing
 * name over the top of that would answer a question the entry already answered. No entry carries
 * both today — every directional entry comes from `viewsOf` or `atEachYaw`, neither of which names
 * parts — so the precedence is a statement about which fact is authoritative rather than a branch
 * anything currently takes.
 *
 * Exported for `iconOverlaySheets`, which names a reader's overlay piece clear of every drawing the
 * library already names, across all the overlay sheets rather than one.
 *
 * The facing is slugged rather than used as it stands, because one of them is two words: the classic
 * vocabulary's `right side` would otherwise put a space in a file name and in an identifier.
 */
export function entrySlots(entry: ComponentEntry, facings: SheetFacings): readonly string[] {
  if (entry.parts !== undefined) return entry.parts;
  if (facings !== 'run' && entry.count === facings.length) {
    return facings.map((facing) => `${entry.label}-${slugify(facing)}`);
  }
  if (entry.count === 1) return [entry.label];
  return Array.from({ length: entry.count }, (_, index) => `${entry.label}-${String(index + 1)}`);
}
