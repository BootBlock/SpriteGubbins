import { parseJson } from './readers.ts';
import { parseProjectRow } from './rows.ts';
import { STORAGE_KEYS } from './schema.ts';
import type { WebStorageLike } from './webStorage.ts';

/**
 * Whether the stored projects account for everything filed under them.
 *
 * Every row under the key must parse. A row that does not — one an earlier build wrote in a shape
 * this one no longer reads, or one damaged on the way — would be dropped by the backend's reader,
 * and every preset filed under it would name a project that is not there. A key that is absent is
 * the same loss where a preset collection is stored beside it, and a first visit where nothing is.
 *
 * `null` where storage refuses the read: nothing can be judged, and a discard on a store that cannot
 * be read is a guess at the reader's expense.
 */
function projectsAreIntact(storage: WebStorageLike): boolean | null {
  try {
    const stored = storage.getItem(STORAGE_KEYS.projects);
    if (stored === null) {
      return (
        storage.getItem(STORAGE_KEYS.customPresets) === null &&
        storage.getItem(STORAGE_KEYS.quantisePresets) === null
      );
    }
    const parsed = parseJson(stored);
    return Array.isArray(parsed) && parsed.every((row) => parseProjectRow(row) !== null);
  } catch {
    return null;
  }
}

/**
 * Empty the three library collections together if the projects cannot all be read.
 *
 * The fallback's half of what `discardIncompatibleDatabase.ts` does for SQLite, and for the same
 * reason: both preset collections file each entry under a project, so losing the projects while
 * keeping the presets leaves every one of them under a project that no longer exists. The backend's
 * reader answers an unreadable collection with an empty one, `fetchProjects` then writes a lone
 * Default over the key, and the presets are counted in the Projects tab's header and listed under
 * nothing. It is a discard and not a repair: nothing is re-filed, and the presets go with their
 * projects.
 *
 * Only the library. History, the settings and the session name no project, and each already falls
 * back to its own default when it cannot be read.
 *
 * A refused write is not reported, and does not stop the other two: this runs as the backend is
 * made, where there is nobody to tell, and a collection it could not empty is the one the reader had
 * before.
 */
export function discardIncompatibleLibrary(storage: WebStorageLike): void {
  if (projectsAreIntact(storage) !== false) return;
  for (const key of [STORAGE_KEYS.customPresets, STORAGE_KEYS.quantisePresets, STORAGE_KEYS.projects]) {
    try {
      storage.setItem(key, '[]');
    } catch {
      continue;
    }
  }
}
