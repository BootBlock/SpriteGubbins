/**
 * One drawing of a part: the words an entry names it with, and the suffix the drawing's own name takes.
 *
 * Both halves are authored, for the reason {@link ComponentEntry.parts} gives — a name slugged from the
 * prose would be renamed by rewording it, and `at rest` is a phrase where `rest` is a file name.
 *
 * A leaf of its own because three builders write their entries from it: a vehicle's division in
 * `vehicleDivision.ts`, a creature's body in `creatureBody.ts` and a character's in `characterBody.ts`.
 */
export interface PartDrawing {
  /** `at rest`, `stowed`, `root segment` — what the entry calls this drawing. */
  readonly text: string;
  /** `rest`, `stowed`, `root` — what the component's own name ends in. */
  readonly slug: string;
}
