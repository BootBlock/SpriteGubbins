/**
 * What the sprite panel says about what the segmentation found, keyed to the state it found it in.
 *
 * Here rather than inline in the component for the reason every other block of user-facing copy in
 * this app is filed here: it is content, it ships in the bundle, and it is read by strangers. Filed
 * beside `paletteLock.ts` rather than in `constants/tooltips/`, which is where a *control's*
 * guidance lives — these describe the state of the reader's own image, as
 * `QUANTISE_SCALE_GUIDANCE` does, and the panel's one control has its own entry in
 * `QUANTISE_TOOLTIPS`.
 *
 * None of them names a figure. The badge beside the paragraph states the count, and the line under
 * it states the size, so a third copy in prose would be one more place for them to disagree.
 */
export const SPRITE_GUIDANCE = {
  /**
   * Nothing on the result is transparent, so there is nothing to separate anything by.
   *
   * The commonest state this panel is read in, because keying opens off — and the one where the
   * answer looks like a failure and is not. **Two causes, and the copy has to cover both:** keying
   * switched off, and keying switched on at a tolerance that matched nothing. It deliberately does
   * not say which, because the panel cannot tell them apart from the result and the setting is on
   * screen directly above.
   */
  solid:
    'Sprites are found by looking at what is transparent on the finished sheet, and nothing on this one is — so the whole of it reads as one opaque shape and no boundary can be drawn anywhere. If keying is switched off above, switch it on; if it is already on, raise the tolerance until the background field goes. The components will separate as soon as there is space between them.',

  /** Keyed, and it came apart into things a reader can count. */
  found:
    'Each separate piece of artwork on the sheet is counted as a sprite, and pieces no further apart than the gap below are counted as one — which is what puts a floating sword back with the hand holding it, and a shadow back under the feet it belongs to. Switch the preview to Sprites to see the bounds that were drawn. Nothing here changes the sheet: it is a reading of the result, and the download is the same file whatever it says.',

  /** Keyed, and one component came back — either a single-subject sheet, or a key that missed. */
  single:
    'One piece of artwork was found on this sheet. That is the right answer for a sheet holding a single component, and the wrong one for a sheet that should hold several — in which case the pieces are still joined by something the key did not remove, most often a shaded corner of the field or a shadow running between them. Raise the keying tolerance and watch this count.',

  /**
   * More pieces than a sprite sheet has, which is a fact about the keying rather than about sprites.
   */
  scattered:
    'This sheet broke into more separate pieces than a sprite sheet holds, so none of them is being called a sprite. That is almost always the background: a field that has not come out leaves every gap between the components joined, and a tolerance so tight that anti-aliased edges survive leaves each of those edges as its own island. Raise the keying tolerance above, and this becomes a count you can use.',

  /**
   * Keyed, counted, and the count is not the one the prompt contracted for.
   *
   * The reading this panel exists for and could not previously state: the studio knows how many
   * components its prompt asked for, and until the count was compared, a sheet returning nine where
   * twelve were requested looked exactly like a sheet returning twelve. It names both directions
   * because they are different faults — short means the generator dropped entries, over means it
   * added one or the key has left two pieces of one component apart.
   */
  miscount:
    'This sheet holds a different number of sprites from the number the studio’s prompt asked for. A count that is short means the generator dropped entries from the inventory, which mis-maps every component after the gap; a count that is over means it added something, or that two pieces of one component are being read apart. Check the preview’s Sprites mode against the inventory before you take the artwork away — and note that a manifest written from this sheet numbers its sprites rather than naming them, because the positions no longer line up with what was asked for.',

  /** Nothing opaque survived at all — the tolerance has taken the artwork with the field. */
  empty:
    'Nothing opaque is left on this sheet, so there is nothing to count. The keying tolerance has reached past the background and taken the artwork with it — lower it until the sprites come back.',
} as const;
