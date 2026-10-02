/**
 * The studio undo stack's one figure, and what the panel above the subject fields says about it.
 *
 * Filed here rather than in `constants/tooltips/` for the reason `dialHistory.ts` gives: the prose
 * describes the *state* the studio is in, and the two buttons have their own entries in
 * `STUDIO_ACTION_TOOLTIPS`.
 */

/**
 * How many positions the stack keeps before the oldest fall off the front.
 *
 * The quantiser's fifty, for a reason of the same shape. A step here is a category switch, a
 * Randomise, a Reset, a preset load, an assembly base that moved the sheet, or a tick in the icon
 * catalogue. The first five are rare, deliberate acts, and twenty of them was further back than anyone
 * reached; ticks are not rare — a reader building an action bar ticks a dozen icons in a minute — and at
 * twenty they pushed the category switch before them off the stack within one sitting. The cap exists
 * only so a tab left open all day does not keep every studio it has ever held.
 *
 * The opening position falls off with the rest once fifty acts have been performed past it.
 */
export const STUDIO_HISTORY_LIMIT = 50;

/** The paragraph under the two buttons, keyed to whether there is anything to undo. */
export const STUDIO_HISTORY_GUIDANCE = {
  /** Nothing recorded yet, which is every reader's first sight of this panel. */
  open: 'Switching category, Randomise and Reset each replace all sixteen answers below at once, and so does loading a preset or restoring a prompt from the history. Every one of those is recorded here before it happens, so the subject you had is one press away rather than gone. So is choosing an assembly base that moves your sheet or rig, because typing the old base back would not move them home, and so is every tick and untick in the icon catalogue, your own icons included, and every icon of your own you add to your set or change on it. Editing any other field records nothing, because typing the old value back is already the way to undo it — but an edit made after one of those acts is not lost either, because stepping forward again brings the studio back exactly as you left it.',

  /** At least one step back is available. */
  available:
    'Stepping back restores the whole studio as it stood at that position — the category, all sixteen answers, an icon set’s ticked icons and your own, and every setting in Output Configuration, because a category switch moves the sheet mode, the rig, the directions, the camera and the style reference along with the answers. Anything you changed since is not lost: stepping forward again returns the studio exactly as you left it. Nothing outside the Studio tab is touched. Performing another act after stepping back drops whatever you had stepped forward to, exactly as an editor does, so save a subject worth keeping as a preset first.',
} as const;
