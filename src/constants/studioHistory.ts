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
 * Lower than the quantiser's fifty because the two stacks record different things. A dial emits a
 * change per pixel of a drag, so fifty steps there is a handful of decisions; a step here is a
 * category switch, a Randomise, a Reset or a preset load, each of which a reader performs
 * deliberately. Twenty of those is further back than anyone reaches, and the cap exists only so a
 * tab left open all day does not keep every studio it has ever held.
 *
 * The opening position falls off with the rest once twenty acts have been performed past it.
 */
export const STUDIO_HISTORY_LIMIT = 20;

/** The paragraph under the two buttons, keyed to whether there is anything to undo. */
export const STUDIO_HISTORY_GUIDANCE = {
  /** Nothing recorded yet, which is every reader's first sight of this panel. */
  open: 'Switching category and Randomise each replace all sixteen answers below at once, and so does loading a preset or restoring a prompt from the history. Every one of those is recorded here before it happens, so the subject you had is one press away rather than gone. Editing a single field records nothing, because typing the old value back is already the way to undo it — but an edit made after one of those acts is not lost either, because stepping forward again brings the studio back exactly as you left it.',

  /** At least one step back is available. */
  available:
    'Stepping back restores the whole studio as it stood at that position — the category, all sixteen answers, and every setting in Output Configuration, because a category switch moves the sheet mode, the rig, the directions, the camera and the style reference along with the answers. Anything you changed since is not lost: stepping forward again returns the studio exactly as you left it. Nothing outside the Studio tab is touched. Performing another act after stepping back drops whatever you had stepped forward to, exactly as an editor does, so save a subject worth keeping as a preset first.',
} as const;
