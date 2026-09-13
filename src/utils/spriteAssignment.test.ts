import { describe, expect, it } from 'vitest';
import type { SpriteBox } from '../types/quantiser.ts';
import type { SpriteEdit } from '../types/spriteAssignment.ts';
import { resolveAssignment } from './spriteAssignment.ts';
import { spritePin } from './spritePin.ts';

const box = (left: number, top: number, width = 4, height = 4): SpriteBox => ({
  left,
  top,
  width,
  height,
  pixels: width * height,
});

/** Three sprites in reading order, as `spriteSegments` returns them. */
const BOXES = [box(0, 0), box(10, 0), box(20, 0)];
const INVENTORY = ['arm-left', 'arm-right', 'torso'];

/** The edit naming the sprite at `index` — spelled through `spritePin`, as the store's actions are. */
function name(index: number, as: string): SpriteEdit {
  return { pin: spritePin(BOXES[index] as SpriteBox), decision: { kind: 'NAME', name: as } };
}

function leaveOut(index: number): SpriteEdit {
  return { pin: spritePin(BOXES[index] as SpriteBox), decision: { kind: 'LEAVE_OUT' } };
}

function join(index: number, to: number): SpriteEdit {
  return {
    pin: spritePin(BOXES[index] as SpriteBox),
    decision: { kind: 'JOIN', to: spritePin(BOXES[to] as SpriteBox) },
  };
}

describe('resolveAssignment', () => {
  describe('with nothing said about the sheet', () => {
    it('names the pieces from the inventory in reading order', () => {
      const assignment = resolveAssignment(BOXES, [], INVENTORY);

      expect(assignment.naming).toBe('READING_ORDER');
      expect(assignment.pieces.map((piece) => piece.name)).toStrictEqual(INVENTORY);
      expect(assignment.pieces.every((piece) => !piece.assigned)).toBe(true);
    });

    it('numbers them where the counts disagree, padded to the sheet’s own width', () => {
      const many = Array.from({ length: 120 }, (_, index) => box(index * 10, 0));
      const assignment = resolveAssignment(many, [], INVENTORY);
      const names = assignment.pieces.map((piece) => piece.name);

      expect(assignment.naming).toBeNull();
      // Padded so a file listing sorts into the sheet's reading order rather than putting the
      // hundredth piece between the tenth and the eleventh.
      expect([names[0], names[9], names[99], names[119]]).toStrictEqual([
        'sprite-001',
        'sprite-010',
        'sprite-100',
        'sprite-120',
      ]);
    });

    it('numbers them where the studio names no sheet at all', () => {
      const assignment = resolveAssignment(BOXES, [], []);

      expect(assignment.naming).toBeNull();
      expect(assignment.pieces.map((piece) => piece.name)).toStrictEqual([
        'sprite-1',
        'sprite-2',
        'sprite-3',
      ]);
    });
  });

  describe('when the reader names a sprite', () => {
    it('gives a swapped pair the names they were assigned and leaves the rest alone', () => {
      // **The failure the whole feature is for.** This sheet has the right number of pieces and the
      // wrong order, which no count can detect: reading order alone would call sprite 1 `arm-left`
      // and sprite 2 `arm-right`, and a rig importer placing by name would cross the two arms.
      const assignment = resolveAssignment(BOXES, [name(0, 'arm-right'), name(1, 'arm-left')], INVENTORY);

      expect(assignment.naming).toBe('ASSIGNED');
      expect(assignment.pieces.map((piece) => piece.name)).toStrictEqual(['arm-right', 'arm-left', 'torso']);
      expect(assignment.pieces.map((piece) => piece.assigned)).toStrictEqual([true, true, false]);
    });

    it('takes an assigned name out of the pool the unnamed pieces draw from', () => {
      // One name given by hand, and the two left on reading order take what is still free in the
      // inventory's own order — so naming one sprite does not shift every name after it.
      const assignment = resolveAssignment(BOXES, [name(2, 'arm-left')], INVENTORY);

      expect(assignment.pieces.map((piece) => piece.name)).toStrictEqual(['arm-right', 'torso', 'arm-left']);
    });

    it('numbers every piece where one name was given to two of them', () => {
      // Including the two that were named. The preview shows the name each piece will be written
      // as, so a chip reading `torso` over a file about to be written `sprite-02` would be the
      // defect this feature exists to remove, wearing the fix's clothes.
      const assignment = resolveAssignment(BOXES, [name(0, 'torso'), name(1, 'torso')], INVENTORY);

      expect(assignment.naming).toBeNull();
      expect(assignment.pieces.map((piece) => piece.name)).toStrictEqual([
        'sprite-1',
        'sprite-2',
        'sprite-3',
      ]);
    });

    it('drops a name the inventory no longer holds, and counts it', () => {
      // A category swap on the Studio tab rewrites the whole inventory under a loaded sheet.
      const assignment = resolveAssignment(BOXES, [name(0, 'helmet')], INVENTORY);

      expect(assignment.lost).toBe(1);
      expect(assignment.naming).toBe('READING_ORDER');
      expect(assignment.pieces.map((piece) => piece.name)).toStrictEqual(INVENTORY);
    });
  });

  describe('when the reader leaves a sprite out', () => {
    it('drops it from the pieces and brings the count back to the inventory’s', () => {
      const four = [...BOXES, box(30, 0)];
      const stray = { pin: spritePin(box(30, 0)), decision: { kind: 'LEAVE_OUT' } } as const;
      const assignment = resolveAssignment(four, [stray], INVENTORY);

      expect(assignment.pieces).toHaveLength(3);
      expect(assignment.naming).toBe('READING_ORDER');
      expect(assignment.sprites.map((sprite) => sprite.piece)).toStrictEqual([0, 1, 2, null]);
    });

    it('keeps the sprite in the list so it can be put back', () => {
      const assignment = resolveAssignment(BOXES, [leaveOut(1)], INVENTORY);

      expect(assignment.sprites).toHaveLength(3);
      expect(assignment.sprites[1]?.decision).toStrictEqual({ kind: 'LEAVE_OUT' });
    });
  });

  describe('when the reader joins two sprites', () => {
    it('writes them as one piece cut to the box that holds both', () => {
      const assignment = resolveAssignment(BOXES, [join(1, 0)], INVENTORY);

      expect(assignment.pieces).toHaveLength(2);
      expect(assignment.pieces[0]?.box).toStrictEqual({
        left: 0,
        top: 0,
        width: 14,
        height: 4,
        // Summed rather than re-measured: the segmentation's pieces are connected components of one
        // pass, so no two of them hold the same pixel and the sum is exact.
        pixels: 32,
      });
      expect(assignment.sprites.map((sprite) => sprite.piece)).toStrictEqual([0, 0, 1]);
      expect(assignment.sprites.map((sprite) => sprite.leads)).toStrictEqual([true, false, true]);
      // The second member points back at the sprite it was joined to, counting from one, so it can
      // be labelled `joined to 1` rather than repeating the piece's name on a second chip.
      expect(assignment.sprites.map((sprite) => sprite.joinedTo)).toStrictEqual([null, 1, null]);
    });

    it('folds a chain of three into one piece', () => {
      const assignment = resolveAssignment(BOXES, [join(1, 0), join(2, 1)], INVENTORY);

      expect(assignment.pieces).toHaveLength(1);
      expect(assignment.pieces[0]?.members).toHaveLength(3);
    });

    it('names the joined piece through the member the reader named', () => {
      // Four fragments joined into three pieces, which is what lets a three-name inventory attach at
      // all. The name is set on the sprite that leads the joined piece, because a sprite holds one
      // decision and a join is one — the row for the other half shows its join instead.
      const fragmented = [...BOXES, box(30, 0)];
      const joinLast = {
        pin: spritePin(box(30, 0)),
        decision: { kind: 'JOIN' as const, to: spritePin(BOXES[2] as SpriteBox) },
      };
      const assignment = resolveAssignment(fragmented, [joinLast, name(2, 'arm-left')], INVENTORY);

      expect(assignment.pieces).toHaveLength(3);
      expect(assignment.pieces[2]?.name).toBe('arm-left');
      expect(assignment.pieces[2]?.members).toHaveLength(2);
      expect(assignment.naming).toBe('ASSIGNED');
    });

    it('counts a second decision on a joined sprite as lost rather than silently replacing one', () => {
      // A sprite holds one decision, and the four answers are exclusive. Naming the half that is
      // joined to another says nothing the join has not already said about which piece it is in.
      const assignment = resolveAssignment(BOXES, [join(1, 0), name(1, 'torso')], INVENTORY);

      expect(assignment.lost).toBe(1);
      expect(assignment.sprites[1]?.decision).toStrictEqual({
        kind: 'JOIN',
        to: spritePin(BOXES[0] as SpriteBox),
      });
    });

    it('drops a join whose partner is no longer on the sheet, and counts it', () => {
      const gone = {
        pin: spritePin(BOXES[1] as SpriteBox),
        decision: { kind: 'JOIN', to: { x: 99, y: 99 } },
      };
      const assignment = resolveAssignment(BOXES, [gone as SpriteEdit], INVENTORY);

      expect(assignment.lost).toBe(1);
      expect(assignment.pieces).toHaveLength(3);
      // Dropped whole rather than left as a grouping of one, which would read on screen as a join
      // that had worked.
      expect(assignment.sprites[1]?.decision).toBeNull();
    });
  });

  it('drops every decision whose sprite the dials have re-cut away, and counts them', () => {
    const assignment = resolveAssignment(BOXES, [name(0, 'torso'), leaveOut(1)], INVENTORY);
    const recut = resolveAssignment([box(40, 40)], [name(0, 'torso'), leaveOut(1)], INVENTORY);

    expect(assignment.lost).toBe(0);
    expect(recut.lost).toBe(2);
  });
});
