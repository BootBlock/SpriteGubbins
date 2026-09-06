import type { PersistenceBackend } from './backend.ts';
import { HeldElsewhereBackend } from './heldElsewhereBackend.ts';
import { LocalStorageBackend } from './localStorageBackend.ts';
import { openSqliteBackend } from './openSqliteBackend.ts';

/**
 * The app's one entry point to storage.
 *
 * Picks SQLite-on-OPFS if it can be brought up, and one of two answers if it can't. Which one it got
 * is reported by `backend.kind` — the only thing above this module that should care, and only
 * so the interface can tell the user where their data actually lives.
 *
 * **The second answer used to be the only one, and that was the defect.** `sqlite ?? new
 * LocalStorageBackend()` reads as though every failure to open a database means the same thing, and
 * two of the three do: no OPFS, a private window, an exhausted quota are all "this browser cannot
 * store one here", and localStorage is right for each. The third is another tab of this origin
 * holding the SAH pool's access handles, where OPFS is present and the database exists and holds the
 * reader's work — and answering *that* with a second, empty store is how a reader ends up with two
 * libraries, saves into the one nothing reads, and loses it when the first tab closes.
 */

/**
 * Memoised so concurrent callers share one initialisation.
 *
 * The *promise* is cached rather than the resolved backend, which matters: several stores hydrate
 * at once on boot, and caching only the result would let each of them start its own WASM module
 * load and race to install the same OPFS pool.
 */
let backendPromise: Promise<PersistenceBackend> | null = null;

export function getDatabase(): Promise<PersistenceBackend> {
  backendPromise ??= openBackend();
  return backendPromise;
}

async function openBackend(): Promise<PersistenceBackend> {
  const open = await openSqliteBackend();
  if (open.kind === 'OPEN') return open.backend;
  return open.refusal === 'HELD_ELSEWHERE' ? new HeldElsewhereBackend() : new LocalStorageBackend();
}

/**
 * Drop the memoised backend. Exists for tests, which need each case to start from a known state;
 * nothing in the app calls it, because there is no situation in which the running app should
 * change where it stores things mid-session.
 */
export function resetDatabaseForTests(): void {
  backendPromise = null;
}
