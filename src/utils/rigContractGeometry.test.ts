import { describe, expect, it } from 'vitest';
import type { RigContract, RigSlot } from '../types/rigContract.ts';
import { rigContractGeometry } from './rigContractGeometry.ts';

/**
 * Section 5's per-piece block, which is the whole of what a rig contract adds to the prompt.
 *
 * The assertions are about **what a generator is told**, not about the wording: a size that is not
 * stated, a joint at the wrong end and a height that reads as a depth are each a piece drawn wrong,
 * and none of them is visible anywhere else in this app.
 */

function slot(over: Partial<RigSlot>): RigSlot {
  return {
    slot_id: 'upper_arm_l',
    pack_piece_name: 'left-upper-arm',
    parent_slot: 'torso',
    piece_size: { width: 8, height: 22 },
    piece_pivot: { x: 4, y: 3 },
    joint_edge: 'top',
    rest_position_in_frame: { x: -11, y: -78 },
    ...over,
  };
}

function contract(...slots: RigSlot[]): RigContract {
  return {
    format: 'unsung-saviour-rig-contract',
    version: 1,
    skeleton_name: 'Humanoid',
    frame_size: { width: 48, height: 96 },
    slots,
  };
}

describe('rigContractGeometry', () => {
  it('states the frame every size is a share of, once', () => {
    const block = rigContractGeometry(contract(slot({})));

    expect(block).toContain('48 × 96 px assembled figure');
    // Once: the frame in every line as well would be four hundred characters of repetition on a
    // fifteen-piece rig, in a prompt already measured against a target's budget.
    expect(block.match(/48 × 96/g)).toHaveLength(1);
  });

  it('states each piece at its own size, with the end its joint is at', () => {
    const block = rigContractGeometry(contract(slot({})));

    expect(block).toContain('**left-upper-arm** — 8 × 22 px, joint at the top edge');
  });

  it('turns the contract’s downward Y into a height above the base', () => {
    // The file measures from the figure's feet with Y increasing downward, so a shoulder is stored
    // at -78. Passed through, a generator reads a negative height — which is not a height at all.
    const block = rigContractGeometry(contract(slot({})));

    expect(block).toContain('78 px above the base');
    expect(block).not.toContain('-78');
  });

  it('says which side of the centre line a joint is on, and when it is on it', () => {
    const offset = rigContractGeometry(contract(slot({})));
    const centred = rigContractGeometry(contract(slot({ rest_position_in_frame: { x: 0, y: -48 } })));
    const right = rigContractGeometry(contract(slot({ rest_position_in_frame: { x: 11, y: -78 } })));

    expect(offset).toContain('11 px left of centre');
    expect(centred).toContain('on the centre line');
    expect(right).toContain('11 px right of centre');
  });

  it('names the piece each one is carried by, in the vocabulary the sheet uses', () => {
    // `parent_slot` holds a slot id and the prompt states none of those, so the parent has to be
    // resolved to its pack name. A rig whose two vocabularies differ — which the writer's own
    // example does — would otherwise cite `torso_bone`, a word appearing nowhere else in the prompt.
    const block = rigContractGeometry(
      contract(
        slot({ slot_id: 'pelvis_bone', pack_piece_name: 'pelvis', parent_slot: '' }),
        slot({ slot_id: 'torso_bone', pack_piece_name: 'torso', parent_slot: 'pelvis_bone' }),
        slot({ parent_slot: 'torso_bone' }),
      ),
    );

    expect(block).toContain('it is the piece the whole rig hangs from');
    expect(block).toContain('carried by pelvis');
    expect(block).toContain('carried by torso');
    expect(block).not.toContain('pelvis_bone');
    expect(block).not.toContain('torso_bone');
  });

  it('says nothing about a parent no slot declares, rather than naming it', () => {
    const block = rigContractGeometry(contract(slot({ parent_slot: 'a_slot_that_is_not_here' })));

    expect(block).not.toContain('a_slot_that_is_not_here');
    expect(block).toContain('78 px above the base.');
  });

  it('writes one line per piece, in the contract’s own order', () => {
    const block = rigContractGeometry(
      contract(slot({ pack_piece_name: 'pelvis' }), slot({ pack_piece_name: 'torso' })),
    );
    const lines = block.split('\n').filter((line) => line.startsWith('- '));

    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('pelvis');
    expect(lines[1]).toContain('torso');
  });

  it('says nothing at all where no contract is loaded', () => {
    // The value is still supplied to the compiler, which throws on a token it has no value for; it
    // is the template's own condition that drops the block.
    expect(rigContractGeometry(null)).toBe('');
  });
});
