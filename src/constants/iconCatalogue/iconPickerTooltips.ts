import { fieldLabelFor } from '../categories/index.ts';

/**
 * Guidance for the catalogue dialog's three filters — the controls there that hold a value.
 *
 * Filed beside the kind labels the filter offers, as a setting's guidance is. None of the three
 * reaches the prompt or the roster: they decide which rows the dialog shows, and the cards say so,
 * because a reader who has just watched rows vanish needs to know their ticks did not go with them.
 */
export const ICON_PICKER_TOOLTIPS = {
  search: `Narrows the catalogue to the icons whose role, slot name, group or look under your ${fieldLabelFor('ICON', 'setting')} contains every word you type. It hides rows and nothing more: your ticks, the set and the prompt stay as they are.`,

  kind: 'Shows the shelves of one kind, or every kind. _Items and consumables_ are things a character carries and uses up; _Interface and system_ are the panels, markers and status icons a game’s interface draws. Choosing one hides the other shelves and leaves your ticks alone.',

  tickedOnly:
    'Lists only the icons already on your set, so you can review the set in one place and untick what it no longer needs. An icon you untick here leaves the list at once. The filter itself changes nothing in the set or the prompt.',
} as const;
