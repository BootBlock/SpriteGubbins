import type { IconCatalogueEntry } from '../types/iconCatalogue.ts';

/**
 * The slot names an entry's drawings take — its id, or `<id>-<state>` for each state of a toggle — and so
 * the stems of the files the sprite pack cuts them to.
 *
 * One rule for every reader that names them: the inventory line's `parts`, a row's guidance card, and
 * the check that keeps a reader's own entry from answering to a name something else already has.
 */
export function iconSlotNames(entry: Pick<IconCatalogueEntry, 'id' | 'states'>): readonly string[] {
  return entry.states === undefined ? [entry.id] : entry.states.map((state) => `${entry.id}-${state}`);
}
