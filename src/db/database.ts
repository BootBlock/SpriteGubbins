import type { PersistenceBackend } from './backend.ts';
import { LocalStorageBackend } from './localStorageBackend.ts';
import { openSqliteBackend } from './sqliteBackend.ts';

/**
 * The app's one entry point to storage.
 *
 * Picks SQLite-on-OPFS if it can be brought up, and localStorage if it can't. Which one it got
 * is reported by `backend.kind` — the only thing above this module that should care, and only
 * so the interface can tell the user where their data actually lives.
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
  const sqlite = await openSqliteBackend();
  return sqlite ?? new LocalStorageBackend();
}

/**
 * Drop the memoised backend. Exists for tests, which need each case to start from a known state;
 * nothing in the app calls it, because there is no situation in which the running app should
 * change where it stores things mid-session.
 */
export function resetDatabaseForTests(): void {
  backendPromise = null;
}
