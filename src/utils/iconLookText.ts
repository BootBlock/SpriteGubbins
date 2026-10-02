import { fieldLabelFor } from '../constants/categories/index.ts';
import { DAMAGE_SCHOOL_DEFINITIONS } from '../constants/iconCatalogue/damageSchools.ts';
import { lookFamilyOfWorld } from '../constants/iconCatalogue/lookFamilyOfWorld.ts';
import type { IconCatalogueEntry } from '../types/iconCatalogue.ts';
import { damageSchoolName } from './damageSchoolName.ts';

/**
 * What one catalogue entry is drawn as in this world: the look its family writes, or — for a world the
 * family table does not name — the role itself, handed to the world to interpret. A spell closes on its
 * school: the name this world gives it, and the one colour by hex — `… — fire school, its dominant colour
 * orange #F97316`.
 *
 * **The fallback names the field rather than guessing a family.** A reader who types `Dieselpunk Sky
 * Pirates` has said something no family captures, and drawing their potion as a fantasy flask would be
 * the app overruling them. Section 1 states their world word for word, so the honest instruction is to
 * draw the role as that world would make it, and the field's own label is how the inventory points at
 * that line.
 *
 * **The school is said here, in the one resolver every reader of a look shares** — the sheet's inventory
 * line, the catalogue row's second line and its card, and the dialog's search — so the colour the prompt
 * asks for is the colour the row shows, and a search for “fire” finds the fire school in a fantasy
 * world. It is the entry's own colour, so the icon sheet's intro ranks it above the set's primary and
 * accent colours for that icon.
 */
export function iconLookText(entry: IconCatalogueEntry, world: string): string {
  const family = lookFamilyOfWorld(world);
  const look =
    family === null
      ? `${entry.role.charAt(0).toLowerCase()}${entry.role.slice(1)}, drawn as the stated ${fieldLabelFor('ICON', 'setting')} would make it`
      : entry.looks[family];
  if (entry.school === undefined) return look;
  const { colourName, hex } = DAMAGE_SCHOOL_DEFINITIONS[entry.school];
  return `${look} — ${damageSchoolName(entry.school, world)} school, its dominant colour ${colourName} ${hex}`;
}
