import { fieldLabelFor } from '../constants/categories/index.ts';
import { lookFamilyOfWorld } from '../constants/iconCatalogue/lookFamilyOfWorld.ts';
import type { IconCatalogueEntry } from '../types/iconCatalogue.ts';

/**
 * What one catalogue entry is drawn as in this world: the look its family writes, or — for a world the
 * family table does not name — the role itself, handed to the world to interpret.
 *
 * **The fallback names the field rather than guessing a family.** A reader who types `Dieselpunk Sky
 * Pirates` has said something no family captures, and drawing their potion as a fantasy flask would be
 * the app overruling them. Section 1 states their world word for word, so the honest instruction is to
 * draw the role as that world would make it, and the field's own label is how the inventory points at
 * that line.
 */
export function iconLookText(entry: IconCatalogueEntry, world: string): string {
  const family = lookFamilyOfWorld(world);
  if (family !== null) return entry.looks[family];
  const role = entry.role.charAt(0).toLowerCase() + entry.role.slice(1);
  return `${role}, drawn as the stated ${fieldLabelFor('ICON', 'setting')} would make it`;
}
