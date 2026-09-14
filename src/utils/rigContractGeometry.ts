import type { RigContract, RigSlot } from '../types/rigContract.ts';

/**
 * Section 5's per-piece geometry, written out of the engine's own rig.
 *
 * **This is the block the whole file exists to make possible.** Without it section 5 can say that a
 * pivot is the centre of a joint cap and that matching caps share a diameter, and nothing at all
 * about how long a piece is against the figure or where along it the joint sits — so the model draws
 * a limb to its own sense of proportion, and the engine's importer, which registers each piece flush
 * against its joint edge at one scale for the whole actor, opens a gap under a short one and
 * overlaps the next with a long one.
 *
 * **Positions are stated in words, not in the contract's own signs.** The file measures from the
 * figure's feet with Y increasing downward, so a shoulder is at `-78`; a model reads *78 px above
 * the base* and cannot read a negative height as one. The sign is turned once, here, rather than
 * being explained to the reader of every line.
 *
 * **The sizes are not repeated in section 4.** That section lists what to draw and fixes the reading
 * order; this one states the geometry. A size stated in both is a size that can disagree with
 * itself, and section 4's own rule is that its list and the count in front of it are one arithmetic.
 */

/** Where a piece's joint sits in the assembled frame, as a phrase a generator can draw to. */
function joinAt(slot: RigSlot): string {
  const { x, y } = slot.rest_position_in_frame;
  const across =
    x === 0 ? 'on the centre line' : `${String(Math.abs(x))} px ${x < 0 ? 'left' : 'right'} of centre`;
  // Above the base is the only direction a rig piece sits, and the contract writes it negative.
  const up = `${String(Math.abs(y))} px above the base`;
  return `${across}, ${up}`;
}

/**
 * One piece's line, with its parent named as the rest of the prompt names it.
 *
 * **`parent_slot` holds a `slot_id`, and the prompt states no slot ids.** Every name in section 4
 * and every name that leads a line here is a `pack_piece_name`, which is a different vocabulary —
 * the engine's own pairing is `upper_arm_l` with `left-upper-arm`. Emitting the raw parent would
 * point the model at an identifier appearing nowhere else in the prompt, which is worse than
 * silence: the joint hierarchy is the only thing the clause contributes, and an unresolvable name
 * contributes nothing while looking as though it does.
 *
 * A `parent_slot` naming no declared slot therefore says nothing at all, rather than repeating it.
 */
function line(slot: RigSlot, named: ReadonlyMap<string, string>): string {
  const size = `${String(slot.piece_size.width)} × ${String(slot.piece_size.height)} px`;
  const pivot = `${String(slot.piece_pivot.x)}, ${String(slot.piece_pivot.y)}`;
  const parent = named.get(slot.parent_slot);
  const onto =
    slot.parent_slot === ''
      ? ', and it is the piece the whole rig hangs from'
      : parent === undefined
        ? ''
        : `, carried by ${parent}`;
  return (
    `- **${slot.pack_piece_name}** — ${size}, joint at the ${slot.joint_edge} edge, ` +
    `pivot at ${pivot}. Its joint sits ${joinAt(slot)}${onto}.`
  );
}

/**
 * The whole block, or an empty string where no contract is loaded.
 *
 * The intro states the two conventions every line below depends on — where a pivot is measured from,
 * and what the sizes are a share of — once rather than fifteen times.
 */
export function rigContractGeometry(contract: RigContract | null): string {
  if (contract === null) return '';

  const frame = `${String(contract.frame_size.width)} × ${String(contract.frame_size.height)} px`;
  // Slot id to the name the sheet knows that piece by, because a `parent_slot` is stated in the
  // first vocabulary and the prompt only ever establishes the second.
  const named = new Map(contract.slots.map((slot) => [slot.slot_id, slot.pack_piece_name]));
  return (
    `Every piece below is drawn at its stated size within the ${frame} assembled figure, and the ` +
    'assembly is built by rotating these pieces about the joints named here. A piece drawn larger ' +
    'or smaller than its stated size leaves a gap or an overlap at its joint that no rig corrects. ' +
    'Each pivot is given as pixels across and down from that piece’s own top-left corner, and each ' +
    'joint position from the centre of the figure’s base.\n\n' +
    contract.slots.map((slot) => line(slot, named)).join('\n')
  );
}
