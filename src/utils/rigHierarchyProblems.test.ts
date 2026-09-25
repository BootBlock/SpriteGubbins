import { describe, expect, it } from 'vitest';
import { parseRigContract, RIG_CONTRACT_FORMAT, RIG_CONTRACT_VERSION } from './parseRigContract.ts';

/**
 * A parent chain that cannot be a skeleton, refused through the one reader.
 *
 * **Each case here used to parse with no problems**, and section 5 then named the parents it found:
 * a self-parented slot *carried by* itself, and every child of a repeated id pointed at whichever
 * slot came last.
 */

/** A valid slot answering to `id`, hung off `parent`, and named for the sheet after its id. */
function slot(id: string, parent: string, name = id): Record<string, unknown> {
  return {
    slot_id: id,
    pack_piece_name: name,
    parent_slot: parent,
    piece_size: { width: 8, height: 22 },
    piece_pivot: { x: 4, y: 3 },
    joint_edge: 'top',
    rest_position_in_frame: { x: 0, y: -48 },
  };
}

function problemsOf(...slots: Record<string, unknown>[]): readonly string[] {
  return parseRigContract({
    format: RIG_CONTRACT_FORMAT,
    version: RIG_CONTRACT_VERSION,
    skeleton_name: 'Humanoid',
    frame_size: { width: 48, height: 96 },
    slots,
  }).problems;
}

describe('rigHierarchyProblems, through parseRigContract', () => {
  it('accepts one root, and a parent naming a slot the contract does not declare', () => {
    // Section 5 says nothing about an undeclared parent rather than repeat a name the prompt never
    // establishes, so the chain simply ends there.
    expect(problemsOf(slot('pelvis', ''), slot('torso', 'pelvis'), slot('arm', 'shoulder'))).toEqual([]);
  });

  it('refuses two slots sharing a slot_id, which every child would be pointed at the later of', () => {
    const problems = problemsOf(slot('pelvis', ''), slot('arm', 'pelvis'), slot('arm', 'pelvis', 'leg'));

    expect(problems).toEqual([
      'Two slots share the slot_id ‘arm’, so a parent_slot naming it cannot say which one it means.',
    ]);
  });

  it('refuses a slot that names itself as its parent', () => {
    expect(problemsOf(slot('pelvis', ''), slot('self', 'self'))).toEqual([
      '‘self’ names itself as its parent_slot, so nothing carries it.',
    ]);
  });

  it('refuses a loop once, however many slots hang beneath it', () => {
    const problems = problemsOf(
      slot('pelvis', ''),
      slot('hand', 'forearm'),
      slot('forearm', 'upper'),
      slot('upper', 'forearm'),
    );

    expect(problems).toEqual([
      '‘forearm’ and ‘upper’ carry one another in a loop, so none of them hangs from the root.',
    ]);
  });

  it('refuses a rig with more than one root', () => {
    expect(problemsOf(slot('pelvis', ''), slot('tail', ''))).toEqual([
      '‘pelvis’ and ‘tail’ both declare no parent_slot, and a rig hangs from one root.',
    ]);
    expect(problemsOf(slot('a', ''), slot('b', ''), slot('c', ''))[0]).toContain(
      '‘a’, ‘b’ and ‘c’ all declare',
    );
  });
});
