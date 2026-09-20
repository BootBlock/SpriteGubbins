import { UNSUNG_SAVIOUR_HUMANOID_RIG } from '../constants/presets/unsungSaviourRig.ts';
import type { RigContract } from '../types/rigContract.ts';

/**
 * Whether the contract in force is the copy a preset shipped rather than a file the reader exported.
 *
 * **The two are indistinguishable on screen, and one of them can be years old.** A shipped contract
 * is a transcription of an export taken once; the engine's rig can move afterwards and nothing here
 * can see it. Both render as “Humanoid — 15 pieces in a 48 × 96 frame”, so a reader who exported a
 * current contract, then reloaded the preset over it, is looking at the same sentence describing a
 * different document. Saying which is in force is the whole of the fix: a reader who knows it is the
 * shipped one knows whether they need to export again.
 *
 * **Compared field by field rather than by identity**, because identity survives only until the
 * configuration is stored and read back: a history row and a saved preset both come back through
 * `parseRigContract`, which builds new objects. A `JSON.stringify` comparison would agree today and
 * stop agreeing the day either side reorders a key, which is a silent answer rather than a wrong one.
 */
export function isShippedRigContract(contract: RigContract): boolean {
  const shipped = UNSUNG_SAVIOUR_HUMANOID_RIG;
  if (contract === shipped) return true;
  if (
    contract.skeleton_name !== shipped.skeleton_name ||
    contract.frame_size.width !== shipped.frame_size.width ||
    contract.frame_size.height !== shipped.frame_size.height ||
    contract.slots.length !== shipped.slots.length
  ) {
    return false;
  }

  return shipped.slots.every((slot, at) => {
    const other = contract.slots[at];
    return (
      other !== undefined &&
      other.slot_id === slot.slot_id &&
      other.pack_piece_name === slot.pack_piece_name &&
      other.parent_slot === slot.parent_slot &&
      other.piece_size.width === slot.piece_size.width &&
      other.piece_size.height === slot.piece_size.height &&
      other.piece_pivot.x === slot.piece_pivot.x &&
      other.piece_pivot.y === slot.piece_pivot.y &&
      other.joint_edge === slot.joint_edge &&
      other.rest_position_in_frame.x === slot.rest_position_in_frame.x &&
      other.rest_position_in_frame.y === slot.rest_position_in_frame.y
    );
  });
}
