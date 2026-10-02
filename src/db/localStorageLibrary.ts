import type { LibraryPack } from '../types/libraryPack.ts';
import { STORED_COLLECTIONS, type StoredCollection } from './localStorageCollections.ts';

/**
 * The two operations that touch more than one stored collection at once.
 *
 * Filed apart from `localStorageBackend.ts` because they are a different problem from the rest of
 * that class. Every other method there reads one key, changes it and writes it back; these two have
 * to leave four keys consistent with one another **without a transaction**, which is the one thing
 * this backend cannot ask for. What each of them can honestly promise is written at the operation,
 * and neither promise is the SQLite side's — see `sqliteLibrary.ts`, where the same two operations
 * are statements inside a `BEGIN`.
 */

/** How these reach storage: the backend's own reader and writer, bound to its store. */
export interface CollectionPort {
  read<T>(key: string, parse: (value: unknown) => T | null): T[];
  write(key: string, value: unknown): Promise<void>;
}

/**
 * Remove a project and everything filed under it.
 *
 * Four keys rewritten rather than one, and the **order is the whole of the guarantee**: the three
 * saved collections are cleaned before the project itself goes, so a refusal partway leaves saves
 * whose project still exists rather than saves pointing at nothing. The SQLite side needs no such
 * ordering, because its statements either all land or none do.
 */
export async function deleteProjectFrom(port: CollectionPort, id: string): Promise<void> {
  const { presets, quantisePresets, customIcons, projects } = STORED_COLLECTIONS;
  await rewrite(port, presets, (rows) => rows.filter((row) => row.projectId !== id));
  await rewrite(port, quantisePresets, (rows) => rows.filter((row) => row.projectId !== id));
  await rewrite(port, customIcons, (rows) => rows.filter((row) => row.projectId !== id));
  await rewrite(port, projects, (rows) => rows.filter((row) => row.id !== id));
}

/** Read one collection, change it, and write it back through the port. */
function rewrite<T extends { readonly id: string }>(
  port: CollectionPort,
  collection: StoredCollection<T>,
  change: (rows: T[]) => readonly T[],
): Promise<void> {
  return port.write(
    collection.key,
    change(port.read(collection.key, collection.parse)).map(collection.toRow),
  );
}

/** One collection's rows as stored now, to put back if an import is refused partway. */
function heldRows<T extends { readonly id: string }>(port: CollectionPort, collection: StoredCollection<T>) {
  return { key: collection.key, rows: port.read(collection.key, collection.parse).map(collection.toRow) };
}

/**
 * Replace the projects and every saved collection with an imported pack's.
 *
 * The three saved collections keep the file's own order, which is the whole of what a pack says
 * about them, and is the same answer the SQLite side reaches by stamping every imported row with
 * one instant. **The projects do not, because they carry their own timestamps**: the other side
 * inserts those verbatim and lists the table `ORDER BY updated_at DESC`, so a pack written in any
 * other order would come back one way on SQLite and another here. Sorting on the way in is what
 * makes the two agree, and it is done here rather than in the pack because the order a collection
 * is *stored* in is this backend's answer to a question SQLite answers with a clause.
 *
 * **There is no transaction here, so this puts one back by hand.** The four keys are read first,
 * written in turn, and — if any write is refused — restored from those copies before the refusal
 * travels. A quota that rejected the new library will accept the old one back, since it was holding
 * it a moment ago, so the realistic failure ends where it started rather than with presets naming
 * projects the import had already removed. The restore is best-effort by necessity: nothing can be
 * promised about a store that refuses a value it was already holding, and the caller is told the
 * import failed either way.
 */
export async function replaceLibraryIn(port: CollectionPort, pack: LibraryPack): Promise<void> {
  const { projects, presets, quantisePresets, customIcons } = STORED_COLLECTIONS;
  const previous = [
    heldRows(port, projects),
    heldRows(port, presets),
    heldRows(port, quantisePresets),
    heldRows(port, customIcons),
  ];

  try {
    const ordered = [...pack.projects].sort((left, right) => right.updatedAt - left.updatedAt);
    await port.write(projects.key, ordered.map(projects.toRow));
    await port.write(presets.key, pack.presets.map(presets.toRow));
    await port.write(quantisePresets.key, pack.quantisePresets.map(quantisePresets.toRow));
    await port.write(customIcons.key, pack.customIcons.map(customIcons.toRow));
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
