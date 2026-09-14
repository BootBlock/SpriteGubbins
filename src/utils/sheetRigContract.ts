import type { SheetPlan } from '../types/components.ts';
import type { ImageOutputConfig } from '../types/output.ts';
import type { RigContract } from '../types/rigContract.ts';

/**
 * Which rig a sheet is drawn against — one fact, read in two ways.
 *
 * **A contract is carried by the whole configuration, and a deliverable is several sheets.** A
 * character's core sheet draws whole figures and its rig sheet draws the pieces, so a rig has
 * something to say about exactly one of them. Every consumer asks here rather than testing the plan
 * for itself: the compiler's conditions phase decides whether section 5's geometry block survives,
 * its values phase fills that block, the studio's digest names the loaded rig in a folded header,
 * and the control says when it is not reaching the sheet on screen. Four readings of one question
 * is how a heading comes to stand over an empty block, or a prompt to state the engine's frame in
 * section 2 and the reader's typed size in section 5.
 *
 * `posing === 'AT_REST'` is the test because it is what makes a sheet a rig sheet — the same value
 * `fixedRigMode` reads to settle the rig mode outright, rather than a second enumeration of which
 * sheets those are.
 */

/** Whether this sheet's inventory *is* a rig's pieces. */
export function sheetDrawsRigPieces(plan: SheetPlan): boolean {
  return plan.posing === 'AT_REST';
}

/** The rig this sheet is drawn against, or `null` — none loaded, or not this sheet. */
export function sheetRigContract(plan: SheetPlan, output: ImageOutputConfig): RigContract | null {
  return sheetDrawsRigPieces(plan) ? output.rigContract : null;
}
