import { ICONS_PER_SHEET } from './iconSheetLimits.ts';

/**
 * How long each text of a reader's own icon entry may be.
 *
 * **Sized from the catalogue, with room to spare.** The longest catalogue role is 34 characters and the
 * longest look 149, so a reader is never held tighter than the shipped entries are written; the limits
 * stop a paragraph pasted into the look from becoming one inventory line a generator reads as several
 * icons, and keep a sheet of sixteen custom lines inside what one prompt carries comfortably. A state
 * or a family member's name becomes part of a file name, so it is held to a word or two, and a member's
 * own phrase only says how it differs from its siblings, the shared look saying the rest.
 */
export const CUSTOM_ICON_LIMITS = {
  role: 48,
  look: 200,
  state: 24,
  variantName: 24,
  variantLook: 80,
} as const;

/**
 * How many members a family of the reader's own may have (`CustomIconEntry.variants`).
 *
 * **At least two**, since one member is a single icon. **At most half a sheet**, because a family is
 * kept on one sheet so its members are drawn side by side to one design: half a sheet leaves the
 * balanced cut room to place it, and keeps its one inventory line, each member's name and phrase
 * included, short enough to read as one icon's line. Eight covers a dose ladder and every rarity a game
 * names.
 */
export const CUSTOM_ICON_FAMILY_SIZE = {
  fewest: 2,
  most: ICONS_PER_SHEET / 2,
} as const;
