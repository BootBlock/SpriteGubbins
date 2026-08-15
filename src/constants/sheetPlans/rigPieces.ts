/**
 * The sentence the character and creature rig plans close their inventory with.
 *
 * **One copy, because it is one claim** — it was written out in `character.ts` and `creature.ts`
 * alike, so rewording either left the other stating the opposite of it. The object and vehicle rigs
 * close with a pivot-geometry sentence of their own and never carried this one.
 *
 * **And it names no figure, because a plan cannot see the configuration.** It used to read "An
 * eight-direction rig is eight of these sheets, not one sheet of 120 pieces": true of
 * `EIGHT_COMPASS` and shipped unchanged into a four-cardinal rig of sixty pieces and a three-view
 * one, and unmoved when a subject's additional anatomy raised the per-sheet count. It was the same
 * hand-maintained arithmetic `componentCountFor` exists to have removed from the inventory headings.
 * The numbers a reader actually needs are derived and stated where they are true: section 0's
 * contract, the assembly section's per-sheet list, and the split drawer's batch total.
 */
export const RIG_PIECES_OUTRO = `A rig covering more than one direction is one of these sheets per direction, never a single sheet
holding every direction at once. Run it once per direction with the same identity lock.`;
