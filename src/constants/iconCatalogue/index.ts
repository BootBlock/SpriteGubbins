import type { IconCatalogueEntry, IconCatalogueGroup } from '../../types/iconCatalogue.ts';
import { AMMUNITION } from './ammunition.ts';
import { BOOSTS } from './boosts.ts';
import { CHAT } from './chat.ts';
import { COMBAT_STATUS } from './combatStatus.ts';
import { CONTAINERS } from './containers.ts';
import { CONTROL_ABILITIES } from './controlAbilities.ts';
import { CRAFTING_MATERIALS } from './craftingMaterials.ts';
import { CRAFTING_PROFESSIONS } from './craftingProfessions.ts';
import { CRYO_ATTACKS } from './cryoAttacks.ts';
import { CURRENCY } from './currency.ts';
import { EMOTES } from './emotes.ts';
import { EQUIPMENT_SLOTS } from './equipmentSlots.ts';
import { FOOD_AND_DRINK } from './foodAndDrink.ts';
import { GATHERING_PROFESSIONS } from './gatheringProfessions.ts';
import { KINETIC_ATTACKS } from './kineticAttacks.ts';
import { LOOT_ROLLS } from './lootRolls.ts';
import { MAP_PINS } from './mapPins.ts';
import { MOBILITY_ABILITIES } from './mobilityAbilities.ts';
import { MOUNTS } from './mounts.ts';
import { NANITE_ATTACKS } from './naniteAttacks.ts';
import { NETRUN_ATTACKS } from './netrunAttacks.ts';
import { NEURAL_ATTACKS } from './neuralAttacks.ts';
import { PET_COMMANDS } from './petCommands.ts';
import { PETS } from './pets.ts';
import { QUEST_ITEMS } from './questItems.ts';
import { RESTORATIVES } from './restoratives.ts';
import { SERVICES } from './services.ts';
import { SOCIAL_PANELS } from './socialPanels.ts';
import { SUPPORT_ABILITIES } from './supportAbilities.ts';
import { SYSTEM_PANELS } from './systemPanels.ts';
import { THERMAL_ATTACKS } from './thermalAttacks.ts';
import { THROWABLES } from './throwables.ts';
import { TOOLS_AND_KEYS } from './toolsAndKeys.ts';
import { TOXIC_ATTACKS } from './toxicAttacks.ts';
import { UTILITY_ABILITIES } from './utilityAbilities.ts';
import { VOLTAIC_ATTACKS } from './voltaicAttacks.ts';

/**
 * Every group of the icon catalogue, in the order the picker shelves them: by kind in `ICON_KINDS`
 * order — items and consumables, spells and abilities, emotes and chat, mounts and pets, professions,
 * then the interface and system icons.
 *
 * **The order is the roster's order too** (`sortIconPicks`), so it decides which icons share a sheet:
 * a school's seven attacks sit together, the attack shelves follow `DAMAGE_SCHOOLS`, and the support,
 * mobility, control and utility abilities follow them. `iconCatalogue.test.ts` holds the shelves to
 * the kinds' order, so a group added out of place fails there rather than splitting a kind in two.
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
  KINETIC_ATTACKS,
  THERMAL_ATTACKS,
  CRYO_ATTACKS,
  VOLTAIC_ATTACKS,
  TOXIC_ATTACKS,
  NEURAL_ATTACKS,
  NETRUN_ATTACKS,
  NANITE_ATTACKS,
  SUPPORT_ABILITIES,
  MOBILITY_ABILITIES,
  CONTROL_ABILITIES,
  UTILITY_ABILITIES,
  EMOTES,
  CHAT,
  MOUNTS,
  PETS,
  PET_COMMANDS,
  CRAFTING_PROFESSIONS,
  GATHERING_PROFESSIONS,
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
 * Every entry's place in the catalogue's shelving order, counted across all the groups.
 *
 * A roster is kept in this order (`sortIconPicks`), so the sheets of a series draw a shelf's icons side
 * by side — the restoratives on one sheet, the map pins on another — however the reader ticked them.
 */
const CATALOGUE_ORDER: ReadonlyMap<string, number> = new Map(
  ICON_CATALOGUE_GROUPS.flatMap((group) => group.entries).map((entry, at) => [entry.id, at] as const),
);

/** Every entry's group by the entry's id — how a pick is counted towards its kind. */
const GROUPS_BY_ENTRY: ReadonlyMap<string, IconCatalogueGroup> = new Map(
  ICON_CATALOGUE_GROUPS.flatMap((group) => group.entries.map((entry) => [entry.id, group] as const)),
);

/** Where an entry sits in the catalogue's shelving order, or `undefined` for an id it does not hold. */
export function iconCatalogueOrder(id: string): number | undefined {
  return CATALOGUE_ORDER.get(id);
}

/** The group an entry is shelved in, or `undefined` for an id the catalogue does not hold. */
export function iconCatalogueGroupOf(id: string): IconCatalogueGroup | undefined {
  return GROUPS_BY_ENTRY.get(id);
}

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
