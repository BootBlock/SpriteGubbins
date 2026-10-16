import type { IconDrawings } from '../types/iconRoster.ts';

/**
 * The slot names an entry's drawings take — its id, `<id>-<state>` for each state of a toggle, or
 * `<id>-<name>` for each member of a family — and so the stems of the files the sprite pack cuts them to.
 *
 * One rule for every reader that names them: the inventory line's `parts`, a row's guidance card, and
 * the check that keeps a reader's own entry from answering to a name something else already has.
 */
export function iconSlotNames(entry: IconDrawings & { readonly id: string }): readonly string[] {
  const suffixes = entry.variants?.map((variant) => variant.name) ?? entry.states;
  return suffixes === undefined ? [entry.id] : suffixes.map((suffix) => `${entry.id}-${suffix}`);
}
