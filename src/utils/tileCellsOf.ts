import type { SheetPlan } from '../types/components.ts';

/**
 * The cells a placement sheet puts a full-tile piece in (`ComponentEntry.fillsTile`), counted from zero
 * in the reading order the prompt lays one piece to a cell, which is the order of the plan's entries
 * and each entry's components.
 */
export function tileCellsOf(plan: SheetPlan): readonly number[] {
  const cells: number[] = [];
  let at = 0;
  for (const entry of plan.groups.flatMap((group) => group.entries)) {
    for (let copy = 0; copy < entry.count; copy += 1) {
      if (entry.fillsTile === true) cells.push(at);
      at += 1;
    }
  }
  return cells;
}
