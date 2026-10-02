import { iconCatalogueOrder } from '../constants/iconCatalogue/index.ts';

/**
 * A roster's picks in the catalogue's shelving order, each once, with any id the catalogue does not
 * hold left out.
 *
 * **The roster's order is the catalogue's, not the order the reader ticked in.** The series cuts the
 * picks sixteen components to a sheet in this order, so keeping it canonical puts a shelf's icons side
 * by side on one generation — the three healing tiers together, the map pins together — which is what
 * lets the generator hold their family resemblance. It also makes a roster a set: two readers ticking the
 * same icons in a different order get the same sheets, and the same sheet ticks.
 */
export function sortIconPicks(picks: readonly string[]): readonly string[] {
  const placed = new Map<string, number>();
  for (const id of picks) {
    const at = iconCatalogueOrder(id);
    if (at !== undefined) placed.set(id, at);
  }
  return [...placed.entries()].sort(([, a], [, b]) => a - b).map(([id]) => id);
}
