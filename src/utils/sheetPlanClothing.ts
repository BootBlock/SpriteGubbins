import type { SheetPlan } from '../types/components.ts';

/**
 * Whether this sheet's inventory draws the subject's `clothing` value as components of its own.
 *
 * Section 1's paint rule and section 4's inventory have to agree inside one prompt, and which of
 * them is right about the `clothing` line is a fact about the sheet being compiled — see
 * `ComponentEntry.drawsClothing` in `types/components.ts`, which is where each plan states it and
 * why it is stated on the entry rather than on the plan or on the category.
 *
 * Derived rather than declared a second time: a plan that drops the entry drawing the attribute
 * stops claiming the exception in the same edit, so section 1 cannot come to except something
 * section 4 no longer lists.
 */
export function planDrawsClothing(plan: SheetPlan): boolean {
  return plan.groups.some((group) => group.entries.some((entry) => entry.drawsClothing === true));
}
