import type { ComponentEntry, SheetPlan } from '../types/components.ts';
import type { RigContract } from '../types/rigContract.ts';

/**
 * The rig sheet's inventory, taken from the engine's own contract instead of from this app's table.
 *
 * **One override, four consequences.** The inventory *is* the plan: section 4's prose, the names
 * `componentSlots` gives each sprite, the count the studio checks a budget against and the count the
 * Sprites panel expects are all derived from it. So a contract that replaces the plan's entries
 * replaces all four at once, and none of the four can disagree with the others afterwards.
 *
 * **The names are the engine's, verbatim.** `pack_piece_name` is the key the engine's importer looks
 * a returned piece up by, so a sheet whose inventory calls it anything else — including a tidier
 * spelling of the same thing — is a piece with no socket. That is the whole reason the file exists,
 * and slugging the name here would put the hand-maintained mapping straight back.
 *
 * **The order is the contract's.** Section 4 fixes the sheet's reading order from the inventory, and
 * the contract's slot order is the engine's atlas column order, so the *n*th piece is the *n*th
 * component and the *n*th manifest entry with no matching step anywhere.
 *
 * Everything outside the entries is left alone. The plan's assembly sentence, its scale example and
 * its outro are statements about how a rig sheet is drawn, which no contract has an opinion about —
 * and its `posing` is what said this was a rig sheet in the first place.
 */
export function rigContractPlan(plan: SheetPlan, contract: RigContract): SheetPlan {
  const entries: readonly ComponentEntry[] = contract.slots.map((slot) => ({
    label: slot.pack_piece_name,
    parts: [slot.pack_piece_name],
    text: slot.pack_piece_name,
    count: 1,
    kind: 'anatomy' as const,
  }));

  const named = contract.skeleton_name === '' ? 'the rig' : contract.skeleton_name;
  // Spread rather than assigned, because the plan's own group may carry no outro and
  // `exactOptionalPropertyTypes` tells an absent key apart from one holding `undefined`.
  const outro = plan.groups[0]?.outro;
  const closing = outro === undefined ? {} : { outro };

  return {
    ...plan,
    groups: [
      {
        heading: null,
        // Why the lines read as identifiers rather than as prose, which they otherwise would not:
        // these are the words the engine keys each returned piece by. The sizes are deliberately not
        // repeated here — section 5 states each piece's geometry, and a size stated twice is a size
        // that can disagree with itself.
        intro:
          `One piece per line, in the order ${named} declares them, each named exactly as the ` +
          'engine that assembles them names it. Draw one component for each:',
        entries,
        ...closing,
      },
    ],
  };
}
