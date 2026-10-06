import type { TileCells } from '../types/cellLattice.ts';
import type { ComponentEntry, SheetPlan, TileRole } from '../types/components.ts';

/**
 * The cells a placement sheet puts a piece that measures or spans the tile square in
 * (`ComponentEntry.tile`), counted from zero in the reading order the prompt lays one piece to a cell,
 * which is the order of the plan's entries and each entry's components.
 */
export function tileCellsOf(plan: SheetPlan): TileCells {
  const measuring: number[] = [];
  const spanning: number[] = [];
  let at = 0;
  for (const entry of plan.groups.flatMap((group) => group.entries)) {
    for (let copy = 0; copy < entry.count; copy += 1) {
      const role = roleOf(entry, copy);
      if (role === 'MEASURES') measuring.push(at);
      if (role !== null) spanning.push(at);
      at += 1;
    }
  }
  return { measuring, spanning };
}

/** The role one component of a line takes, or `null` where it keeps a place of its own. */
function roleOf(entry: ComponentEntry, copy: number): TileRole | null {
  if (entry.tile === undefined) return null;
  return typeof entry.tile === 'string' ? entry.tile : (entry.tile[copy] ?? null);
}
