/**
 * The undo stack's two figures, and what the panel above the dials says about it.
 *
 * Filed beside `paletteLock.ts` and `quantisePresets.ts` for the reason those give: the prose here
 * describes the *state* the tab is in rather than explaining a control, and the two buttons have
 * their own entries in `QUANTISE_ACTION_TOOLTIPS`.
 */

/**
 * How long after an edit a further edit of the same dial extends it rather than starting a step.
 *
 * A slider emits a change per pixel of travel and a held arrow key repeats many times a second, so
 * without coalescing one drag across `FILL_CLEANUP_RANGE` is fifty undo steps and the control is
 * useless. The window has to sit above the gap between two events of one gesture and below the pause
 * before a reader makes a second, separate decision. The longest gap inside a gesture is the wait
 * before a held key starts repeating, which the operating system decides and a reader can usually
 * lengthen — commonly around half a second, and up to about a second where it is settable.
 *
 * 700 ms is therefore a judgement rather than a measurement, and it is the one figure here worth
 * revisiting if a drag ever splits into steps: a reader on a long repeat delay would see the first
 * auto-repeated press land as a step of its own, which is a step too many rather than a lost
 * position.
 */
export const DIAL_COALESCE_MS = 700;

/**
 * How many positions the stack keeps before the oldest fall off the front.
 *
 * An entry is thirteen primitives, so the cap is not about memory — it is about what an undo stack
 * is for. Fifty steps back is further than anyone tunes in one sitting, and an uncapped stack in a
 * tab that is left open all day is a promise to return to a position from a sheet three files ago.
 * The opening position falls off with the rest once fifty steps have been taken past it; the way
 * back to the defaults is Clear, which says so.
 */
export const DIAL_HISTORY_LIMIT = 50;

/** The paragraph under the two buttons, keyed to whether there is anything to undo. */
export const DIAL_HISTORY_GUIDANCE = {
  /** Nothing moved yet, which is every reader's first sight of this panel. */
  open: 'Finding the settings a sheet wants means moving a dial, looking at what it did, and often moving it back. Every change you make to the dials on this tab is recorded here from now on, so you can step back through them without remembering where each one started. A drag counts as one step rather than one per pixel of travel, and loading a saved set counts as one step too — so the positions you had before you tried it are one press away.',

  /** At least one step back is available. */
  available:
    'Stepping back moves the dials only. The sheet, the pixel grid and a locked palette are left where they are, and the sheet is simply read again at the positions you step to. Changing a dial after stepping back drops whatever you had stepped back from, exactly as an editor does — so if a position is worth keeping, save it as a set below before you carry on. Clearing the tab starts the record again from the defaults.',
} as const;
