import type { CustomIconEntry } from './iconRoster.ts';

/**
 * An icon of the reader's own, kept in one project's library so a later set can tick it again without
 * it being typed twice.
 *
 * **The library and a set each hold their own copy.** Ticking a library entry copies it onto the
 * roster (`IconPick`'s `CUSTOM` arm), and that copy is what a session, a saved preset and a history
 * entry store, so each of them stays the prompt it was. Editing an entry in the catalogue dialog
 * changes the library's copy and the copy on the set in front of the reader; a set saved before keeps
 * its own. Deleting a library entry leaves every set's copy where it is.
 *
 * **A slot name answers to one entry per project**: `checkCustomIcon` refuses an entry whose slot
 * another of the same project's library holds, as it refuses one the roster or the catalogue holds,
 * so ticking any library entry onto any set of its project never cuts two sprites to one file.
 *
 * Stored in the `custom_icon_entries` table and the localStorage fallback's matching key, and carried
 * by the library pack, each filed under its project as the two preset collections are: deleting a
 * project deletes its library.
 */
export interface SavedCustomIcon {
  /**
   * The library row's own identity, which an edit keeps — so a role reworded, and with it the slot
   * name, is the same library entry rather than a second one.
   */
  readonly id: string;
  /** The project whose library holds it, by that project's id. */
  readonly projectId: string;
  /** The entry as `checkCustomIcon` passed it, slot name included. */
  readonly entry: CustomIconEntry;
}
