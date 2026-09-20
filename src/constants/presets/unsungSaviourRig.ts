import type { RigContract } from '../../types/rigContract.ts';

/**
 * Unsung Saviour's `Humanoid` rig, as that project's Rig Intake tab exports it.
 *
 * **A copy, and deliberately so.** The rig is declared in the other repository, in
 * `resources/rigs/humanoid_rig.tres`, and its Rig Intake tab writes this document out under
 * **Export contract...**. Everything below is that file transcribed: the same fifteen slots in the
 * same order, each with the size, pivot, joint end and pack name the engine will register the
 * returned art by. Nothing here is derived — the joint end and the frame position are values the
 * writer resolves, and working either out again in this language would be a second implementation
 * of a rule that lives over there.
 *
 * **Why the preset ships one at all.** Loading a preset applies a whole `ImageOutputConfig`, and
 * `rigContract` is a field of it — so a rig preset carrying none would *clear* a contract the reader
 * had just loaded, and they would have to find the file again after every load. The point of these
 * presets is a prompt that is ready to paste, and without the contract the prompt states the
 * assembled 48 × 96 px and then has to admit that no single piece is that size. Loading a file by
 * hand still works and still wins: the chooser overwrites this the moment a reader picks one.
 *
 * **Nothing in this repository can hold it against its source**, which is the cost of the copy, so
 * two things carry the risk instead. `unsungSaviourRig.test.ts` holds every value that can be
 * checked without the rig — the reader's own format and version, the piece names the character rig
 * plan asks for, and the joint end against the pivot that decides it. And the writing end says so
 * at the point of change: the Rig Intake guide's *What to generate* tells the operator to export the
 * contract again when the rig changes, and it is this constant that then wants replacing.
 *
 * `format` and `version` are written out rather than taken from `parseRigContract`'s constants. They
 * describe *the document this was copied from*, not what the reader accepts, and borrowing the
 * reader's values would let a stale copy re-label itself the day this app is taught a version 2.
 */
export const UNSUNG_SAVIOUR_HUMANOID_RIG: RigContract = {
  format: 'unsung-saviour-rig-contract',
  version: 1,
  skeleton_name: 'Humanoid',
  frame_size: { width: 48, height: 96 },
  slots: [
    {
      slot_id: 'pelvis',
      pack_piece_name: 'pelvis',
      parent_slot: '',
      piece_size: { width: 20, height: 12 },
      piece_pivot: { x: 10, y: 6 },
      joint_edge: 'bottom',
      rest_position_in_frame: { x: 0, y: -48 },
    },
    {
      slot_id: 'torso',
      pack_piece_name: 'torso',
      parent_slot: 'pelvis',
      piece_size: { width: 26, height: 26 },
      piece_pivot: { x: 13, y: 24 },
      joint_edge: 'bottom',
      rest_position_in_frame: { x: 0, y: -56 },
    },
    {
      slot_id: 'head',
      pack_piece_name: 'head',
      parent_slot: 'torso',
      piece_size: { width: 20, height: 20 },
      piece_pivot: { x: 10, y: 16 },
      joint_edge: 'bottom',
      rest_position_in_frame: { x: 0, y: -80 },
    },
    {
      slot_id: 'upper_arm_l',
      pack_piece_name: 'left-upper-arm',
      parent_slot: 'torso',
      piece_size: { width: 8, height: 22 },
      piece_pivot: { x: 4, y: 3 },
      joint_edge: 'top',
      rest_position_in_frame: { x: -11, y: -78 },
    },
    {
      slot_id: 'lower_arm_l',
      pack_piece_name: 'left-lower-arm',
      parent_slot: 'upper_arm_l',
      piece_size: { width: 7, height: 20 },
      piece_pivot: { x: 3, y: 2 },
      joint_edge: 'top',
      rest_position_in_frame: { x: -11, y: -58 },
    },
    {
      slot_id: 'hand_l',
      pack_piece_name: 'left-hand',
      parent_slot: 'lower_arm_l',
      piece_size: { width: 8, height: 9 },
      piece_pivot: { x: 4, y: 2 },
      joint_edge: 'top',
      rest_position_in_frame: { x: -11, y: -40 },
    },
    {
      slot_id: 'upper_arm_r',
      pack_piece_name: 'right-upper-arm',
      parent_slot: 'torso',
      piece_size: { width: 8, height: 22 },
      piece_pivot: { x: 4, y: 3 },
      joint_edge: 'top',
      rest_position_in_frame: { x: 11, y: -78 },
    },
    {
      slot_id: 'lower_arm_r',
      pack_piece_name: 'right-lower-arm',
      parent_slot: 'upper_arm_r',
      piece_size: { width: 7, height: 20 },
      piece_pivot: { x: 3, y: 2 },
      joint_edge: 'top',
      rest_position_in_frame: { x: 11, y: -58 },
    },
    {
      slot_id: 'hand_r',
      pack_piece_name: 'right-hand',
      parent_slot: 'lower_arm_r',
      piece_size: { width: 8, height: 9 },
      piece_pivot: { x: 4, y: 2 },
      joint_edge: 'top',
      rest_position_in_frame: { x: 11, y: -40 },
    },
    {
      slot_id: 'upper_leg_l',
      pack_piece_name: 'left-upper-leg',
      parent_slot: 'pelvis',
      piece_size: { width: 10, height: 24 },
      piece_pivot: { x: 5, y: 3 },
      joint_edge: 'top',
      rest_position_in_frame: { x: -6, y: -48 },
    },
    {
      slot_id: 'lower_leg_l',
      pack_piece_name: 'left-lower-leg',
      parent_slot: 'upper_leg_l',
      piece_size: { width: 9, height: 22 },
      piece_pivot: { x: 4, y: 2 },
      joint_edge: 'top',
      rest_position_in_frame: { x: -6, y: -26 },
    },
    {
      slot_id: 'foot_l',
      pack_piece_name: 'left-foot',
      parent_slot: 'lower_leg_l',
      piece_size: { width: 14, height: 8 },
      piece_pivot: { x: 5, y: 2 },
      joint_edge: 'top',
      rest_position_in_frame: { x: -6, y: -6 },
    },
    {
      slot_id: 'upper_leg_r',
      pack_piece_name: 'right-upper-leg',
      parent_slot: 'pelvis',
      piece_size: { width: 10, height: 24 },
      piece_pivot: { x: 5, y: 3 },
      joint_edge: 'top',
      rest_position_in_frame: { x: 6, y: -48 },
    },
    {
      slot_id: 'lower_leg_r',
      pack_piece_name: 'right-lower-leg',
      parent_slot: 'upper_leg_r',
      piece_size: { width: 9, height: 22 },
      piece_pivot: { x: 4, y: 2 },
      joint_edge: 'top',
      rest_position_in_frame: { x: 6, y: -26 },
    },
    {
      slot_id: 'foot_r',
      pack_piece_name: 'right-foot',
      parent_slot: 'lower_leg_r',
      piece_size: { width: 14, height: 8 },
      piece_pivot: { x: 5, y: 2 },
      joint_edge: 'top',
      rest_position_in_frame: { x: 6, y: -6 },
    },
  ],
};
