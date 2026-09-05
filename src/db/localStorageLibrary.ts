import type { LibraryPack } from '../types/libraryPack.ts';
import { toPresetRow, toProjectRow, toQuantisePresetRow } from './localStorageRows.ts';
import { parsePresetRow, parseProjectRow, parseQuantisePresetRow } from './rows.ts';
import { STORAGE_KEYS } from './schema.ts';

/**
 * The two operations that touch more than one stored collection at once.
 *
 * Filed apart from `localStorageBackend.ts` because they are a different problem from the rest of
 * that class. Every other method there reads one key, changes it and writes it back; these two have
 * to leave three keys consistent with one another **without a transaction**, which is the one thing
 * this backend cannot ask for. What each of them can honestly promise is written at the operation,
 * and neither promise is the SQLite side's — see `sqliteRequests.ts`, where the same two
 * operations are three statements inside a `BEGIN`.
 */

/** How these reach storage: the backend's own reader and writer, bound to its store. */
export interface CollectionPort {
  read<T>(key: string, parse: (value: unknown) => T | null): T[];
  write(key: string, value: unknown): Promise<void>;
}

/**
 * Remove a project and everything filed under it.
 *
 * Three keys rewritten rather than one, and the **order is the whole of the guarantee**: the two
 * collections are cleaned before the project itself goes, so a refusal partway leaves presets whose
 * project still exists rather than presets pointing at nothing. The SQLite side needs no such
 * ordering, because its three statements either all land or none do.
 */
export async function deleteProjectFrom(port: CollectionPort, id: string): Promise<void> {
  const presets = port.read(STORAGE_KEYS.customPresets, parsePresetRow);
  await port.write(
    STORAGE_KEYS.customPresets,
    presets.filter((entry) => entry.projectId !== id).map(toPresetRow),
  );

  const dials = port.read(STORAGE_KEYS.quantisePresets, parseQuantisePresetRow);
  await port.write(
    STORAGE_KEYS.quantisePresets,
    dials.filter((entry) => entry.projectId !== id).map(toQuantisePresetRow),
  );

  const projects = port.read(STORAGE_KEYS.projects, parseProjectRow);
  await port.write(STORAGE_KEYS.projects, projects.filter((entry) => entry.id !== id).map(toProjectRow));
}

/**
 * Replace all three collections with an imported pack's.
 *
 * The two preset collections keep the file's own order, which is the whole of what a pack says
 * about them, and is the same answer the SQLite side reaches by stamping every imported row with
 * one instant. **The projects do not, because they carry their own timestamps**: the other side
 * inserts those verbatim and lists the table `ORDER BY updated_at DESC`, so a pack written in any
 * other order would come back one way on SQLite and another here. Sorting on the way in is what
 * makes the two agree, and it is done here rather than in the pack because the order a collection
 * is *stored* in is this backend's answer to a question SQLite answers with a clause.
 *
 * **There is no transaction here, so this puts one back by hand.** The three keys are read first,
 * written in turn, and — if any write is refused — restored from those copies before the refusal
 * travels. A quota that rejected the new library will accept the old one back, since it was holding
 * it a moment ago, so the realistic failure ends where it started rather than with presets naming
 * projects the import had already removed. The restore is best-effort by necessity: nothing can be
 * promised about a store that refuses a value it was already holding, and the caller is told the
 * import failed either way.
 */
export async function replaceLibraryIn(port: CollectionPort, pack: LibraryPack): Promise<void> {
  const previous = [
    { key: STORAGE_KEYS.projects, rows: port.read(STORAGE_KEYS.projects, parseProjectRow).map(toProjectRow) },
    {
      key: STORAGE_KEYS.customPresets,
      rows: port.read(STORAGE_KEYS.customPresets, parsePresetRow).map(toPresetRow),
    },
    {
      key: STORAGE_KEYS.quantisePresets,
      rows: port.read(STORAGE_KEYS.quantisePresets, parseQuantisePresetRow).map(toQuantisePresetRow),
    },
  ];

  try {
    const projects = [...pack.projects].sort((left, right) => right.updatedAt - left.updatedAt);
    await port.write(STORAGE_KEYS.projects, projects.map(toProjectRow));
    await port.write(STORAGE_KEYS.customPresets, pack.presets.map(toPresetRow));
    await port.write(STORAGE_KEYS.quantisePresets, pack.quantisePresets.map(toQuantisePresetRow));
  } catch (error) {
    for (const { key, rows } of previous) {
      // Swallowed one by one rather than around the loop: a store that refuses one key back has no
      // bearing on whether it will take the next, and the failure that matters — the one the caller
      // acts on — is the write that started this.
      try {
        await port.write(key, rows);
      } catch {
        continue;
      }
    }
    throw error;
  }
}
