/**
 * One drawing of a part: the words an entry names it with, and the suffix the drawing's own name takes.
 *
 * Both halves are authored, for the reason `ComponentEntry.parts` gives — a name slugged from the prose
 * would be renamed by rewording it, and `at rest` is a phrase where `rest` is a file name. A vehicle's
 * drive positions and a character's limb variants are both written in it.
 */
export interface PartDrawing {
  /** `at rest`, `neutral lowered`, `folded against the back` — what the entry calls this drawing. */
  readonly text: string;
  /** `rest`, `neutral`, `folded` — what the component's own name ends in. */
  readonly slug: string;
}
