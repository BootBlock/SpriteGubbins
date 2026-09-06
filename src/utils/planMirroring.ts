import type { SheetPlan } from '../types/components.ts';

/**
 * Whether this sheet draws any piece twice, once for each of the subject's two sides.
 *
 * Section 5's Mirroring subsection is a rule about exactly those pieces — what a left version and a
 * right version of one part may share, and what has to be redrawn — and it was fixed text inside the
 * cut-out rig section. So it described “the left and right sets” on all four rigged categories while
 * two of them hold none: the OBJECT rig is a housing, a base, a panel, a subassembly and two
 * fittings, and the VEHICLE rig's sided pieces are a near-side and a far-side drive unit, which are
 * two views of one machine under a fixed camera rather than a mirror pair.
 *
 * Read off {@link ComponentEntry.mirrors}, which is the entries' own declaration, so a plan that
 * grows or loses a bilateral pair moves the subsection with it. A category added to the rig table
 * gets the right subsection without anything being extended, which is the whole point of asking the
 * sheet rather than keeping a list of the categories that happen to have limbs today.
 */
export function planMirrorsPieces(plan: SheetPlan): boolean {
  return plan.groups.some((group) => group.entries.some((entry) => entry.mirrors !== undefined));
}
