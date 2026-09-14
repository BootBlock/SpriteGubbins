import { describe, expect, it } from 'vitest';
import { parseRigContract, RIG_CONTRACT_FORMAT, RIG_CONTRACT_VERSION } from './parseRigContract.ts';

/**
 * The one reader of a rig contract, and the refusals that keep a half-read one out.
 *
 * **Every case here is a document that would otherwise reach the prompt.** This app has no way to
 * check what comes back against the rig — the artwork is generated somewhere else and imported
 * somewhere else again — so a contract read wrongly is discovered as art drawn to the wrong
 * proportions, two programs away and days later.
 */

/** A document as the writer exports one, small enough to read and complete enough to be valid. */
function document(): Record<string, unknown> {
  return {
    format: RIG_CONTRACT_FORMAT,
    version: RIG_CONTRACT_VERSION,
    skeleton_name: 'Humanoid',
    frame_size: { width: 48, height: 96 },
    facings: ['east', 'south'],
    slots: [
      {
        slot_id: 'pelvis',
        pack_piece_name: 'pelvis',
        parent_slot: '',
        piece_size: { width: 20, height: 12 },
        piece_pivot: { x: 10, y: 6 },
        joint_edge: 'bottom',
        rest_position: { x: 0, y: -48 },
        rest_position_in_frame: { x: 0, y: -48 },
      },
      {
        slot_id: 'upper_arm_l',
        pack_piece_name: 'left-upper-arm',
        parent_slot: 'torso',
        piece_size: { width: 8, height: 22 },
        piece_pivot: { x: 4, y: 3 },
        joint_edge: 'top',
        rest_position: { x: -11, y: -22 },
        rest_position_in_frame: { x: -11, y: -78 },
      },
    ],
    draw_orders: { east: ['upper_arm_l', 'pelvis'] },
  };
}

describe('parseRigContract', () => {
  it('reads a well-formed document and keeps every field the prompt states', () => {
    const { contract, problems } = parseRigContract(document());

    expect(problems).toEqual([]);
    expect(contract?.frame_size).toEqual({ width: 48, height: 96 });
    expect(contract?.facings).toEqual(['east', 'south']);
    expect(contract?.slots.map((slot) => slot.pack_piece_name)).toEqual(['pelvis', 'left-upper-arm']);
    expect(contract?.slots[1]?.piece_size).toEqual({ width: 8, height: 22 });
    expect(contract?.slots[1]?.joint_edge).toBe('top');
    expect(contract?.slots[1]?.rest_position_in_frame).toEqual({ x: -11, y: -78 });
  });

  it('drops the two fields nothing here can state', () => {
    // Both are real fields of the exported document, and carrying them would be carrying data no
    // section prints: this app draws pieces rather than layering them, and the relative rest
    // position is an offset against a parent bone that only the engine assembles.
    const { contract } = parseRigContract(document());

    expect(contract).not.toBeNull();
    expect(contract).not.toHaveProperty('draw_orders');
    expect(contract?.slots[0]).not.toHaveProperty('rest_position');
  });

  it('refuses a JSON file that is not a rig contract, and says what it is instead', () => {
    const { contract, problems } = parseRigContract({ ...document(), format: 'sprite-pack-manifest' });

    expect(contract).toBeNull();
    expect(problems[0]).toContain('sprite-pack-manifest');
  });

  it('refuses a version it was not built against rather than reading it hopefully', () => {
    // The whole value of the writer stating a version is a reader that stops here. Read hopefully, a
    // version 2 document whose sizes moved into a different field would parse to a rig of pieces
    // measuring nothing, and every refusal below would then fire on a file that is perfectly good.
    const { contract, problems } = parseRigContract({ ...document(), version: 2 });

    expect(contract).toBeNull();
    expect(problems[0]).toContain('version 2');
  });

  it('refuses a slot with no pack piece name, which is the name the sheet lists it under', () => {
    const broken = document();
    (broken['slots'] as Record<string, unknown>[])[1]!['pack_piece_name'] = '';

    const { contract, problems } = parseRigContract(broken);

    expect(contract).toBeNull();
    expect(problems.join(' ')).toContain('pack_piece_name');
  });

  it('refuses two slots answering to one pack piece name', () => {
    // The mis-mapping the name exists to prevent: the sheet would draw the piece twice under one
    // name, and the engine's importer would place one of them into the other's socket in silence.
    const broken = document();
    (broken['slots'] as Record<string, unknown>[])[1]!['pack_piece_name'] = 'pelvis';

    const { contract, problems } = parseRigContract(broken);

    expect(contract).toBeNull();
    expect(problems.join(' ')).toContain('‘pelvis’');
  });

  it('refuses a frame that encloses nothing, which every piece size is a share of', () => {
    const { contract, problems } = parseRigContract({
      ...document(),
      frame_size: { width: 0, height: 96 },
    });

    expect(contract).toBeNull();
    expect(problems.join(' ')).toContain('assembled frame');
  });

  it('refuses a joint edge that is neither end of the piece', () => {
    const broken = document();
    (broken['slots'] as Record<string, unknown>[])[0]!['joint_edge'] = 'left';

    const { contract, problems } = parseRigContract(broken);

    expect(contract).toBeNull();
    expect(problems.join(' ')).toContain('not top or bottom');
  });

  it('takes the document whole or not at all, rather than the slots it could read', () => {
    // **The refusal that matters most.** A contract read partly puts the missing pieces' absence in
    // an inventory that is simply shorter than the rig, so the prompt contracts for one piece of a
    // two-piece actor and says nothing about it.
    const broken = document();
    (broken['slots'] as Record<string, unknown>[])[1]!['piece_size'] = { width: 0, height: 0 };

    expect(parseRigContract(broken).contract).toBeNull();
  });

  it('refuses anything that is not an object at all', () => {
    expect(parseRigContract(undefined).contract).toBeNull();
    expect(parseRigContract([document()]).contract).toBeNull();
    expect(parseRigContract('a rig, honestly').problems).toHaveLength(1);
  });
});
