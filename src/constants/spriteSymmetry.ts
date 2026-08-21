/**
 * What the symmetry panel says about what the pass found, keyed to the state it found it in.
 *
 * Filed beside `spriteSegmentation.ts` for the same reason that set is filed there rather than in
 * `constants/tooltips/`: these describe the state of the reader's own sheet, where a *control's*
 * guidance describes the control. The panel's three controls each have their own entry in
 * `QUANTISE_TOOLTIPS`.
 *
 * None of them names a figure. The badges beside the paragraph state the counts and the list under
 * it states each axis, so a third copy in prose would be one more place for them to disagree.
 */
export const SYMMETRY_GUIDANCE = {
  /**
   * The pass is not running, which is how the tab opens.
   *
   * The paragraph a first-time reader meets, so it has to say what the control is *for* — and say
   * plainly, before anyone turns it on, that a great many sprites are asymmetric because that is
   * what the subject is.
   */
  off: 'Sprites drawn facing the viewer or facing away are symmetric by convention, and a generator returns them very nearly so — the two halves agree on the silhouette and drift apart over a buckle, a highlight or a stray outline pixel. This finds the mirror line each sprite is closest to being symmetric about, and reports how much of it actually mirrors there. Plenty of subjects are asymmetric on purpose, though: a drawn weapon, a single pauldron, a strap over one shoulder. Read the sheet before settling anything.',

  /**
   * The pass is on and no reading is on screen — no result yet, or a newer one on its way.
   *
   * Its own paragraph rather than a fall-back to one of the others, because every other paragraph
   * here is wrong in this state. `off` tells the reader to read the sheet before settling anything,
   * which is not advice to give somebody in the middle of a snap they have just asked for; the three
   * below all point at a list that is not on screen; and `snapped` and `refused` are *findings*, so
   * shown against a reading taken under the previous setting they assert an outcome the pass has not
   * reached. That last one is the worst of the four: selecting SNAP would have said, for as long as
   * the sheet took, that nothing had qualified.
   */
  pending:
    'The sheet is being read. Each separate piece of artwork on it is scored against the candidate mirror lines within reach of its own centre, and the one its two halves agree best about is the axis reported for it. The axes and their shares appear here as soon as the reading settles.',

  /**
   * Nothing was segmented, so there are no sprites to score — a statement about the *keying*.
   *
   * It points at the panel above rather than restating that panel's own diagnosis: the sheet may be
   * solid, scattered, or empty, and each of those already has a paragraph there saying which.
   */
  none: 'No sprite was found on this sheet, so there is nothing to measure a mirror line inside. Symmetry is read per sprite, over the pieces the sheet was separated into — the panel above says why it separated into none, and this fills in as soon as it does.',

  /** Reported and nothing rewritten, which is what `CHECK` always does. */
  read: 'Each sprite has been scored against every candidate mirror line within reach of its own centre, and the one its two halves agree best about is listed below with the share of the sprite that mirrors there. A high share on a subject you drew symmetric means the generator complied; a low one means the halves have drifted, or that the subject was never symmetric to begin with. Nothing has been changed — the sheet, the download and everything stored are exactly as the dials above left them.',

  /** `SNAP`, and at least one sprite reached the floor. */
  snapped:
    'The sprites marked below reached the confidence floor, so each mirrored pair of pixels inside them has been written with one colour and their two halves now match exactly. The colour written is whichever of the pair’s two has more of its own colour beside it inside the sprite — the pixel that continues what it is part of, rather than the one that breaks it — so a gap in a contour is closed from the intact side rather than being copied across to the other one. Anything that has no counterpart inside the sprite — the reach of an arm the mirror line cannot pair — is left exactly as it arrived rather than being deleted or invented. Sprites below the floor were reported and not touched.',

  /** `SNAP`, and nothing qualified — the state that reads as a broken feature and is not. */
  refused:
    'No sprite on this sheet mirrors closely enough to reach the confidence floor, so none has been changed. That is the ordinary answer for subjects that are asymmetric on purpose, and it is also what a sheet looks like when its halves have drifted further apart than the tolerance admits. The shares listed below say which: a sprite in the high eighties has drifted, and one near half is a subject with something on one side only.',
} as const;
