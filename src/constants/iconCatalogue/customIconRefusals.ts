import { CUSTOM_ICON_FAMILY_SIZE, CUSTOM_ICON_LIMITS } from './customIconLimits.ts';

/** The texts of an entry a refusal can be about, keyed as `CUSTOM_ICON_LIMITS` keys them. */
export type CustomIconText = keyof typeof CUSTOM_ICON_LIMITS;

/** Each text as a refusal names it. */
const TEXT_NAMES: Readonly<Record<CustomIconText, string>> = {
  role: 'role',
  look: 'look',
  state: 'state',
  variantName: 'variant’s name',
  variantLook: 'variant’s look',
};

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

  variantEmpty: (position: number): string =>
    `Name variant ${String(position)} with at least one plain letter from a to z or digit, such as “small”. It names that drawing’s slot.`,

  sameVariants: 'Give each variant a different name, since each one names a drawing’s slot.',

  variantSemicolon:
    'Your variant’s look contains a semicolon, which the sheet uses to divide one variant from the next. Use a comma or a word instead.',

  familySize: (count: number): string =>
    `A family has from ${String(CUSTOM_ICON_FAMILY_SIZE.fewest)} to ${String(CUSTOM_ICON_FAMILY_SIZE.most)} variants, and yours has ${String(count)}.`,

  statesAndVariants:
    'An icon is one drawing, a pair of states or a family of variants, never both a pair and a family.',

  tooLong: (what: CustomIconText, length: number): string =>
    `Your ${TEXT_NAMES[what]} is ${String(length)} characters long, and a ${TEXT_NAMES[what]} holds at most ${String(CUSTOM_ICON_LIMITS[what])}.`,

  brackets: (what: CustomIconText): string =>
    `Your ${TEXT_NAMES[what]} contains a square bracket. The prompt uses square brackets for its own section references, so use round brackets instead.`,

  countMarker: (what: CustomIconText): string =>
    `Your ${TEXT_NAMES[what]} contains a count, such as “×5” or “x5”. The sheet reads a count as that many separate drawings, so name one icon and leave the count to the game.`,

  separator: (what: CustomIconText): string =>
    `Your ${TEXT_NAMES[what]} contains a long dash, which the sheet uses to divide an icon’s role from its look. Use a comma or a word instead.`,

  gone: 'This icon is no longer on your set, so there is nothing to save these changes to. Cancel, and add it again if you still want it.',

  schoolMissing: 'Choose the damage school this spell belongs to. Its colour leads the icon.',

  schoolStray:
    'Only a spell or ability belongs to a damage school, so an entry of another kind cannot name one.',

  taken: (slot: string, owner: string): string =>
    `This entry would name a sprite \`${slot}\`, which ${owner} already answers to. Reword the role, the states or the variants so each sprite keeps a file of its own.`,
} as const;
