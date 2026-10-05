import { describe, expect, it } from 'vitest';
import type { CellLattice } from '../types/cellLattice.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import type { SpriteEdit } from '../types/spriteAssignment.ts';
import { resolveAssignment } from './spriteAssignment.ts';
import { spritePin } from './spritePin.ts';

/**
 * A placement sheet's pieces, grouped, ordered and named by the cell each was drawn in (`cellLattice`),
 * with the reader's own decisions applied on top.
 */
const box = (left: number, top: number, width = 10, height = 10): SpriteBox => ({
  left,
  top,
  width,
  height,
  pixels: width * height,
});

/** A tier mark and its pip in cell 0, a badge in cell 1, nothing in cell 2, and a flare in cell 3. */
const BOXES = [box(10, 10, 30, 30), box(50, 10, 6, 6), box(110, 20), box(330, 20)];
const CELL_OF = [0, 0, 1, 3];
const LATTICE: CellLattice = {
  kind: 'CELLS',
  cells: [0, 1, 3].map((index) => {
    const region = { left: index * 100, top: 0, width: 100, height: 100 };
    return { index, region, square: region };
  }),
  cellOf: CELL_OF,
  tileSide: null,
};
const INVENTORY = ['tier-mark', 'locked-mark', 'new-item-flare', 'broken-overlay'];

function leaveOut(index: number): SpriteEdit {
  return { pin: spritePin(BOXES[index] as SpriteBox), decision: { kind: 'LEAVE_OUT' } };
}

describe('resolveAssignment on a placement sheet', () => {
  it('joins the fragments of one cell into one piece before the reader says anything', () => {
    const assignment = resolveAssignment(BOXES, [], INVENTORY, LATTICE);
    expect(assignment.pieces).toHaveLength(3);
    expect(assignment.pieces[0]?.box).toEqual({ left: 10, top: 10, width: 46, height: 30, pixels: 936 });
    expect(assignment.sprites.map((sprite) => sprite.piece)).toEqual([0, 0, 1, 2]);
  });

  it('names each piece for its cell, so an empty cell leaves its neighbours their names', () => {
    const assignment = resolveAssignment(BOXES, [], INVENTORY, LATTICE);
    expect(assignment.naming).toBe('CELL');
    expect(assignment.pieces.map((piece) => piece.name)).toEqual([
      'tier-mark',
      'locked-mark',
      'broken-overlay',
    ]);
  });

  it('orders the pieces by cell, whatever order the boxes came in', () => {
    const shuffled = [BOXES[3], BOXES[2], BOXES[0], BOXES[1]].filter((entry) => entry !== undefined);
    const lattice: CellLattice = { ...LATTICE, cellOf: [3, 1, 0, 0] };
    const assignment = resolveAssignment(shuffled, [], INVENTORY, lattice);
    expect(assignment.pieces.map((piece) => piece.name)).toEqual([
      'tier-mark',
      'locked-mark',
      'broken-overlay',
    ]);
  });

  it('still lets the reader leave a fragment out of its cell’s piece', () => {
    const assignment = resolveAssignment(BOXES, [leaveOut(1)], INVENTORY, LATTICE);
    expect(assignment.pieces[0]?.box).toEqual({ left: 10, top: 10, width: 30, height: 30, pixels: 900 });
    expect(assignment.pieces.map((piece) => piece.name)).toEqual([
      'tier-mark',
      'locked-mark',
      'broken-overlay',
    ]);
  });

  it('numbers every piece where one lies past the inventory', () => {
    const assignment = resolveAssignment(BOXES, [], INVENTORY.slice(0, 2), LATTICE);
    expect(assignment.naming).toBeNull();
    expect(assignment.pieces.map((piece) => piece.name)).toEqual(['sprite-1', 'sprite-2', 'sprite-3']);
  });

  it('groups nothing by cell where the sheet’s cells could not be read', () => {
    const failed: CellLattice = { kind: 'FAILED', reason: 'no gap', boxes: [0] };
    expect(resolveAssignment(BOXES, [], INVENTORY, failed).pieces).toHaveLength(4);
  });
});
