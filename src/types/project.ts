/**
 * A project: the container a saved studio archetype or a saved set of quantiser dials belongs to.
 *
 * Somebody using this app is usually making artwork for **one game**, and the two libraries they
 * fill up are the record of how that game's sprites are asked for. A flat list of saved presets
 * says nothing about which game a preset was for, so the moment a second project starts, every
 * search is through both. A project is the axis that separates them.
 *
 * **The `id` is a GUID and it never changes.** Everything that refers to a project refers to it by
 * that id — the two preset collections' `projectId`, and the pack format — so a reader may rename a
 * project as often as they like without any of those references going stale. Nothing anywhere reads
 * a project's *name* to find it, and nothing may start to: the name is a label a person chose, and
 * two projects are free to carry the same one.
 *
 * The colour is deliberately not a field. It is derived from the id by `projectStopAt`, so it is as
 * fixed as the id is and cannot be edited into a duplicate of the project beside it — see
 * `constants/projects.ts`.
 */
export interface Project {
  /** A GUID, minted once and never rewritten. See the note above. */
  readonly id: string;
  /** What the reader calls it. Not unique, not an identifier, and freely editable. */
  readonly name: string;
  /** One sentence saying what the project is, or empty for a project that has none. */
  readonly description: string;
  /**
   * When the project was made.
   *
   * Kept alongside {@link updatedAt} rather than derived from it, because the two answer different
   * questions and a project that has never been renamed has them equal. This one is what the row
   * reports as the project's age; the other is what the list is ordered by.
   */
  readonly createdAt: number;
  /**
   * When the project's own name or description last changed.
   *
   * **Its contents are not its own edits**, so saving a preset into a project does not touch this.
   * The two preset collections carry their own timestamps and are ordered by them; this orders the
   * projects, and a list that reshuffled every time a preset was saved would be a list nobody could
   * navigate by position.
   */
  readonly updatedAt: number;
}
