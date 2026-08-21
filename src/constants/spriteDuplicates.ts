/**
 * What the duplicates panel says about what the reading found, keyed to the state it found it in.
 *
 * Here rather than inline in the component for the reason `spriteSegmentation.ts` beside it is:
 * these describe the state of the reader's own sheet rather than explaining a control, so they sit
 * with the other findings' copy and not in `constants/tooltips/`. The panel's two controls have
 * their own entries in `QUANTISE_TOOLTIPS`.
 *
 * None of them names a figure. The badges beside the paragraph state the counts, so a second copy
 * in prose would be one more place for them to disagree.
 */
export const DUPLICATE_GUIDANCE = {
  /**
   * Sprites were found, and none of them is another one.
   *
   * The state a good sheet is in, and it has to read as good news rather than as a pass that found
   * nothing — a reader who has just raised the tolerance and seen this wants to know the sheet is
   * clean, not that the control is broken.
   */
  none: 'Every sprite on this sheet is its own drawing at the tolerance in force, so there is nothing to fold. Each pair is laid over the other by its top-left corner and compared cell by cell, so where two drawings differ in size the cells only one of them covers count against the pair — which is what keeps a large sprite and a small one apart, and what lets a silhouette that gained a pixel at one edge still match the frame it came from. Raise the tolerance if two sprites you can see are the same pose are not being grouped.',

  /**
   * Groups were found and nothing has been done about them, which is the ordinary reading state.
   *
   * It names both readings — identical and merely near — because they call for different things: an
   * identical pair is the generator having repeated itself and is worth acting on, while a near pair
   * is a judgement the reader makes by looking.
   */
  found:
    'Some of the sprites on this sheet are the same drawing more than once. Sprites marked identical match pixel for pixel — a frame the generator handed back twice — and the rest came back close enough to count as one at the tolerance in force. Nothing has been changed: this is a reading of the result, and the download is the same file as it was. Switch the preview to Sprites and compare the bounds listed here against the picture before deciding, then turn the snap on if you want the repeats written as one drawing.',

  /**
   * Groups were found and the snap has rewritten them.
   *
   * The one state where the sheet on screen is not the sheet the reading was taken from, and the
   * copy has to say so — a reader who turns the snap on and watches the count *stay* the same would
   * otherwise conclude that nothing happened.
   */
  snapped:
    'Each of these sprites has been rewritten with the first sprite of its group, so the sheet on screen and the file you download hold one drawing of each repeated pose. The reading itself still describes the sheet as it arrived at this step, which is why the counts have not changed — it is the record of what was folded. Whatever made each copy different is gone, so switch the snap off if a sprite you wanted has been taken with them, and use the preview at 1:1 to check what the fold left behind.',

  /**
   * The segmentation found nothing this reading can be taken over.
   *
   * Two causes with one answer, and the panel deliberately does not repeat the sprite panel's
   * diagnosis of which: it is directly above, and saying it twice is two places to disagree.
   */
  unsegmented:
    'Sprites have to be separated before any two of them can be compared, and nothing on this sheet has been. The sprite panel above says what was found instead and what to do about it — most often the background key has not been switched on, or its tolerance has not reached the field yet. This reading starts as soon as there are sprites to read.',
} as const;
