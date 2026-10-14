/**
 * How long each text of a reader's own icon entry may be.
 *
 * **Sized from the catalogue, with room to spare.** The longest catalogue role is 34 characters and the
 * longest look 149, so a reader is never held tighter than the shipped entries are written; the limits
 * stop a paragraph pasted into the look from becoming one inventory line a generator reads as several
 * icons, and keep a sheet of sixteen custom lines inside what one prompt carries comfortably. A state
 * becomes part of a file name, so it is held to a word or two.
 */
export const CUSTOM_ICON_LIMITS = {
  role: 48,
  look: 200,
  state: 24,
} as const;
