/**
 * What the sprite-naming controls say, and what the panel says about the state they are in.
 *
 * Two records, filed together and read by two different rules. `SPRITE_ASSIGNMENT_TOOLTIPS` explains
 * three *controls* and is discovered by `constants/tooltips/tooltips.test.ts` with every other
 * `*_TOOLTIPS` set in the app. `SPRITE_ASSIGNMENT_GUIDANCE` reports the state of the reader's own
 * sheet — how many pieces there are against how many the prompt asked for, and what is stopping the
 * names being attached — which is the `SPRITE_GUIDANCE` case rather than the control case, so it is
 * out of that suite's scope for the reason stated there.
 *
 * None of them names a figure. The badges above the list state the counts, so a third copy in prose
 * would be one more place for them to disagree.
 */

/**
 * The one control each row of the list carries.
 *
 * One control rather than three, because the reader is making **one** choice about this sprite and
 * the four answers are exclusive: a sprite that is joined to another cannot also be left out, and a
 * sprite left out is in no piece to be named. Three controls would let two of them be set at once
 * and leave the app to decide which it was going to ignore, which is a worse answer than a list a
 * reader has to scroll.
 */
export const SPRITE_ASSIGNMENT_TOOLTIPS = {
  sprite:
    'Says what this sprite is, in the one choice the four answers are exclusive over. Left on “reading order” it takes whichever inventory name its position gives it, which is right whenever the generator laid the components out in the order it was asked for. Name it instead wherever the generator did not: a sheet that drew the right arm before the left has the correct number of pieces and the wrong name on both, and nothing but your eyes can see that. “Leave out” keeps it out of the download altogether — no file, no frame, no rect — which is for what the sheet picked up rather than what it drew, such as a detached tip the key cut adrift. “Join to” treats it and the sprite you choose as two halves of one drawing, written as a single piece cut to the box that holds both, which is what puts a blade back with its guard; joins carry through a chain, and whatever else lies inside the combined box is cut in with them.',
} as const;

/** What the panel says under the list, keyed to what is standing between this sheet and its names. */
export const SPRITE_ASSIGNMENT_GUIDANCE = {
  /**
   * Every inventory name is taken exactly once, by reading order alone.
   *
   * The state most sheets arrive in, and the one where the list is worth reading rather than acting
   * on: the paragraph says what the names are resting on, because that assumption is precisely what
   * a misordered sheet defeats without changing a single count.
   */
  readingOrder:
    'Every component the prompt asked for has exactly one sprite, so each piece carries the inventory’s own name. Those names come from position alone — the prompt fixes the order the components are drawn in, and this sheet is being read in that order. Check the labels in the preview against the artwork before you download: a generator that drew two limbs the other way round produces exactly this state, with the right count and two wrong names, and the count cannot tell you so.',

  /** At least one name was assigned by hand, and the set still comes out complete. */
  assigned:
    'Every component the prompt asked for has exactly one sprite, and at least one of them is named the way you said rather than by its position. The manifest records that, so a pipeline reading the pack can tell a name a person checked from one the app inferred by counting. Anything you left on “reading order” takes whichever inventory name is still free, in order, so naming two sprites does not disturb the rest.',

  /** More pieces than the inventory holds — something extra, or something split. */
  over: 'This sheet has more pieces than the prompt asked for, so nothing can be named yet: with an extra piece in the way, every name after it would describe the wrong artwork. Two things cause it. The generator drew something that is not in the inventory, which “leave out” removes; or the key cut one component into fragments, which “join to” puts back together. The counts above tell you how far off the sheet is, and the names attach themselves the moment it matches.',

  /** Fewer pieces than the inventory holds — the generator dropped entries, or the key joined two. */
  short:
    'This sheet has fewer pieces than the prompt asked for, so nothing can be named yet: a missing component would leave every name after it describing the wrong artwork. Either the generator dropped entries from the inventory, which no control here can recover — generate the sheet again — or two components are touching and are being read as one, which a lower sprite gap above may separate. Nothing on this tab can invent a piece that was never drawn.',

  /** The counts agree, but a name has been given to two pieces. */
  duplicated:
    'One inventory name is on two pieces, so nothing can be named yet: a pack cannot hold two files claiming to be the same component. Change one of them, or set it back to “reading order” and let it take whichever name is free. Until that is settled every piece is numbered instead, which is why the preview is showing ordinals rather than the names you chose — your choices are still here in the list.',

  /** The studio names no sheet, so there is no inventory to draw from. */
  noInventory:
    'The studio is not composing a sheet at the moment, so there is no inventory of component names to draw from and the pieces are numbered. You can still leave a sprite out or join two together, and the download will follow — it will simply call them by their place in the reading order. Choose a category and an output on the Studio tab if you want the pieces named.',
} as const;
