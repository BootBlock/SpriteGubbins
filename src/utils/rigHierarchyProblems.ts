import type { RigSlot } from '../types/rigContract.ts';

/**
 * Why the slots' parent chain cannot be a skeleton, or nothing.
 *
 * **Section 5 names each piece's parent**, looked up by `slot_id`, and says of a slot with no parent
 * that it is the piece the whole rig hangs from. Each refusal here is a document that sentence would
 * misstate: a repeated id points every child of either slot at whichever came last, a slot parented
 * on itself or in a loop is *carried by* a piece that is not holding it up, and two roots each claim
 * to be the one the whole rig hangs from.
 *
 * **A parent naming no declared slot is not refused.** Section 5 says nothing about it rather than
 * repeating a name the prompt never establishes, and a chain ending there is a chain that ends, not
 * one that loops.
 */

function quoted(ids: readonly string[]): string {
  const each = ids.map((id) => `‘${id}’`);
  const last = each.pop() ?? '';
  return each.length === 0 ? last : `${each.join(', ')} and ${last}`;
}

/** The loop `from` walks into, or `null` where its chain reaches a root or a name it cannot follow. */
function loopFrom(from: RigSlot, byId: ReadonlyMap<string, RigSlot>): readonly string[] | null {
  const chain: string[] = [];
  let at: RigSlot | undefined = from;
  while (at !== undefined && at.parent_slot !== '') {
    const seen = chain.indexOf(at.slot_id);
    if (seen >= 0) return chain.slice(seen);
    chain.push(at.slot_id);
    at = byId.get(at.parent_slot);
  }
  return null;
}

export function rigHierarchyProblems(slots: readonly RigSlot[]): string[] {
  const problems: string[] = [];
  const byId = new Map<string, RigSlot>();
  for (const slot of slots) {
    if (byId.has(slot.slot_id)) {
      problems.push(
        `Two slots share the slot_id ‘${slot.slot_id}’, so a parent_slot naming it cannot say which ` +
          'one it means.',
      );
    }
    byId.set(slot.slot_id, slot);
  }

  const roots = slots.filter((slot) => slot.parent_slot === '').map((slot) => slot.slot_id);
  if (roots.length > 1) {
    const every = roots.length === 2 ? 'both' : 'all';
    problems.push(`${quoted(roots)} ${every} declare no parent_slot, and a rig hangs from one root.`);
  }

  const reported = new Set<string>();
  for (const slot of slots) {
    // Every slot whose chain runs into a loop finds the same one, so each is reported once.
    const loop = loopFrom(slot, byId);
    if (loop === null || loop.some((id) => reported.has(id))) continue;
    loop.forEach((id) => reported.add(id));
    problems.push(
      loop.length === 1
        ? `${quoted(loop)} names itself as its parent_slot, so nothing carries it.`
        : `${quoted(loop)} carry one another in a loop, so none of them hangs from the root.`,
    );
  }
  return problems;
}
