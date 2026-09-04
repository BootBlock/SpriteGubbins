import type { ComponentEntry } from '../types/components.ts';

/**
 * What a run of inventory entries is worth, summing their counts.
 *
 * **One implementation, because three kinds of reader now ask the question.** `componentSet.ts` sums
 * a group to write the inventory heading and the contract's figure; the sheet plans sum their own
 * entries to spell a count the surrounding prose states; and the tests sum them again to check the
 * two agree. A second `reduce` written at any of those is the arithmetic-done-twice this whole
 * arrangement exists to have removed.
 *
 * It takes the entries rather than a `ComponentGroup` for the reason the plans need: a group's
 * prose is written *against* its entries, so the entries are hoisted to a constant and the group is
 * built around them — there is no group to hand it at the point the sentence is composed.
 *
 * Pure, as everything in this directory is.
 */
export function componentTotal(entries: readonly ComponentEntry[]): number {
  return entries.reduce((total, entry) => total + entry.count, 0);
}
