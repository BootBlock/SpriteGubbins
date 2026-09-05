import type { Project } from '../types/project.ts';

/**
 * The project every install starts with, and the rules that make it the one a save can always
 * reach.
 *
 * A save has to have somewhere to go before the reader has thought about projects at all, so the
 * app makes this one on first boot and files everything under it until they say otherwise. That is
 * the whole of its privilege: in every other respect it is an ordinary row — it is renamed,
 * described, exported and imported like any other, and its own presets are its own.
 */

/**
 * The Default project's id, minted once and written down here.
 *
 * A **fixed** GUID rather than a generated one, because it is the fallback: the pack importer
 * re-files a preset whose project is missing from the file under this id, and a store that had
 * minted its own would have nothing to re-file to on an install that had never booted. It is a real
 * GUID rather than a word like `default` so that it is drawn from the same space as every other
 * project id — nothing anywhere may branch on the *shape* of an id, and a project that reads as a
 * sentinel invites exactly that.
 */
export const DEFAULT_PROJECT_ID = 'd0c9a5be-8f4e-4b7a-9f2d-6f1a0c3b5e77';

/**
 * The longest a project's name may be.
 *
 * A project is chosen from a native `<select>` in three places, and a native select sizes its
 * selected option from its container and truncates rather than wrapping — so a name longer than the
 * narrowest of those controls can show loses its *tail*, which is the half that tells two projects
 * apart when they start with the same word. 50 characters is the app's standing option-label budget,
 * derived in `tests/selectLabelBudget.ts` from the mono advance and the 442px a column owes a
 * select, and `tests/select-option-labels.test.ts` asserts the two figures are the same number.
 *
 * Enforced in two places for two different reasons: the boxes that type a name carry it as
 * `maxLength`, so it cannot be entered, and `parseImportedProject` clamps to it, so a hand-edited
 * pack cannot arrive with a name that breaks the control every save goes through.
 */
export const PROJECT_NAME_MAX_LENGTH = 50;

/** What the Default project is called until the reader calls it something else. */
export const DEFAULT_PROJECT_NAME = 'Default';

/** The sentence it carries until the reader writes their own. */
export const DEFAULT_PROJECT_DESCRIPTION =
  'Where saved presets go when they are not tied to a project of their own.';

/**
 * Whether this project is the one the app guarantees exists.
 *
 * The single test, so the two rules that depend on it cannot drift: the Default project may not be
 * deleted, and it is what an orphaned preset is re-filed under. Renaming and describing it are not
 * on that list — a reader who works on one game should be able to call it by that game's name, and
 * the id is what everything actually refers to.
 */
export function isDefaultProject(id: string): boolean {
  return id === DEFAULT_PROJECT_ID;
}

/**
 * Why this project may not be deleted, or `null` where it may.
 *
 * **Two refusals, one invariant: a save has to have somewhere to go.** The Default project is the
 * one the app makes for itself, so it is never removed — and the *last* project is refused for the
 * same reason even when it is not the Default, because an install can legitimately have no Default
 * at all: a library pack replaces every project with the ones it carries, and it carries a Default
 * only where something in it needed re-filing. Deleting the last project then left both save panels
 * with nothing to file into and their buttons disabled, until a reload rebuilt the Default.
 *
 * Returned as the sentence rather than as a boolean, and read by both the store and the panel, so
 * the button a reader can see and the action behind it cannot disagree about which projects are
 * removable — or say two different things about why.
 */
export function projectDeletionRefusal(id: string, projectCount: number): string | null {
  if (isDefaultProject(id)) {
    return 'The Default project cannot be deleted — it is where a save goes when you have chosen nothing else. You can still rename it.';
  }
  if (projectCount <= 1) {
    return 'This is your only project, so it cannot be deleted — everything you save has to be filed somewhere. Make another one first, or rename this one.';
  }
  return null;
}

/** The Default project as a row, for the boot that finds no projects stored at all. */
export function createDefaultProject(now: number): Project {
  return {
    id: DEFAULT_PROJECT_ID,
    name: DEFAULT_PROJECT_NAME,
    description: DEFAULT_PROJECT_DESCRIPTION,
    createdAt: now,
    updatedAt: now,
  };
}
