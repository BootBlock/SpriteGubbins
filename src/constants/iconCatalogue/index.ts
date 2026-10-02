import type { IconCatalogueEntry, IconCatalogueGroup } from '../../types/iconCatalogue.ts';
import { AMMUNITION } from './ammunition.ts';
import { BOOSTS } from './boosts.ts';
import { COMBAT_STATUS } from './combatStatus.ts';
import { CONTAINERS } from './containers.ts';
import { CURRENCY } from './currency.ts';
import { FOOD_AND_DRINK } from './foodAndDrink.ts';
import { EQUIPMENT_SLOTS } from './equipmentSlots.ts';
import { LOOT_ROLLS } from './lootRolls.ts';
import { MAP_PINS } from './mapPins.ts';
import { CRAFTING_MATERIALS } from './craftingMaterials.ts';
import { QUEST_ITEMS } from './questItems.ts';
import { RESTORATIVES } from './restoratives.ts';
import { SERVICES } from './services.ts';
import { SOCIAL_PANELS } from './socialPanels.ts';
import { SYSTEM_PANELS } from './systemPanels.ts';
import { THROWABLES } from './throwables.ts';
import { TOOLS_AND_KEYS } from './toolsAndKeys.ts';

/**
 * Every group of the icon catalogue, in the order the picker shelves them: items and consumables, then
 * the interface and system icons.
 *
 * **Spells and abilities, emotes and social icons, mounts, pets and professions are not here yet**; they
 * are phase 4 of `docs/todo/icon-catalogue.md`, and each arrives as a group file of its own beside these.
 */
export const ICON_CATALOGUE_GROUPS: readonly IconCatalogueGroup[] = [
  RESTORATIVES,
  BOOSTS,
  FOOD_AND_DRINK,
  THROWABLES,
  AMMUNITION,
  TOOLS_AND_KEYS,
  CRAFTING_MATERIALS,
  CURRENCY,
  QUEST_ITEMS,
  CONTAINERS,
  EQUIPMENT_SLOTS,
  SYSTEM_PANELS,
  SOCIAL_PANELS,
  SERVICES,
  LOOT_ROLLS,
  MAP_PINS,
  COMBAT_STATUS,
];

/** Every catalogue entry by its id — what a roster's picks are resolved through. */
const ENTRIES_BY_ID: ReadonlyMap<string, IconCatalogueEntry> = new Map(
  ICON_CATALOGUE_GROUPS.flatMap((group) => group.entries.map((entry) => [entry.id, entry] as const)),
);

/**
 * The catalogue entry a pick names, or `undefined` for an id the catalogue no longer holds — which a
 * roster parsed from storage drops rather than keeps, so a renamed entry costs a stored set that one
 * icon and nothing else.
 */
export function iconCatalogueEntry(id: string): IconCatalogueEntry | undefined {
  return ENTRIES_BY_ID.get(id);
}

/**
 * How many components one entry is on a sheet: one drawing, or one for each state of a toggle.
 *
 * The one place that arithmetic is written, because four readers need it and agree only if they share
 * it — the roster parser's capacity, the sheet's inventory line, the chunking that keeps a pair on one
 * sheet, and the test rosters built from the whole catalogue.
 */
export function iconComponentCount(entry: IconCatalogueEntry): number {
  return entry.states === undefined ? 1 : entry.states.length;
}
