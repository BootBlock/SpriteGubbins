import { CUSTOM_ICON_LIMITS } from './customIconLimits.ts';

/** The texts of an entry a refusal can be about, as the form labels them. */
type CustomIconText = 'role' | 'look' | 'state';

/**
 * What the catalogue dialog's form says when an entry of the reader's own cannot join the set, beside
 * the field it is about. `checkCustomIcon` chooses the refusal; this is only the words.
 *
 * Each says what is wrong and what to do instead, because a refused button with no word of why reads as
 * a broken form.
 */
export const CUSTOM_ICON_REFUSALS = {
  roleEmpty:
    'Write the icon’s role, such as “Keycard to the vault level”. It opens the icon’s line on the sheet and names its slot.',

  roleUnnamed:
    'Your role needs at least one plain letter from a to z or digit, since its slot and file name are made from those.',

  lookEmpty:
    'Write what the icon looks like in your world, such as “a scorched brass keycard on a snapped chain”.',

  stateEmpty: (which: 'first' | 'second'): string =>
    `Name the ${which} state with at least one plain letter from a to z or digit, such as “on”. It names that drawing’s slot.`,

  sameStates: 'Give the two states different names, since each one names a drawing’s slot.',

  tooLong: (what: CustomIconText, length: number): string =>
    `Your ${what} is ${String(length)} characters long, and a ${what} holds at most ${String(CUSTOM_ICON_LIMITS[what])}.`,

  brackets: (what: CustomIconText): string =>
    `Your ${what} contains a square bracket. The prompt uses square brackets for its own section references, so use round brackets instead.`,

  schoolMissing: 'Choose the damage school this spell belongs to. Its colour leads the icon.',

  schoolStray:
    'Only a spell or ability belongs to a damage school, so an entry of another kind cannot name one.',

  taken: (slot: string, owner: string): string =>
    `This entry would name a sprite \`${slot}\`, which ${owner} already answers to. Reword the role or the states so each sprite keeps a file of its own.`,
} as const;
