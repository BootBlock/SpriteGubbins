/// <reference lib="webworker" />
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { discardIncompatibleDatabase } from './discardIncompatibleDatabase.ts';
import { CREATE_TABLES_SQL, DATABASE_FILENAME, OPFS_POOL_NAME } from './schema.ts';
import { handleRequest } from './sqliteRequests.ts';
import type { DatabaseRefusal, WorkerCall, WorkerHandshake, WorkerReply } from './workerProtocol.ts';

/**
 * The database, and the only thread it can live on.
 *
 * SQLite's SAH-pool VFS needs `FileSystemFileHandle.prototype.createSyncAccessHandle`, and browsers
 * expose that **only inside a worker** — on the main thread the property is simply absent, so
 * `installOpfsSAHPoolVfs` throws "Missing required OPFS APIs" however cross-origin-isolated the page
 * is. That is not a limitation this bridge works around; it is the reason the bridge exists.
 *
 * The worker owns the `Database` handle outright. Nothing but plain data crosses back, and every
 * query runs here, so the synchronous access handles the pool acquires never have to be shared.
 */

const worker = self as unknown as DedicatedWorkerGlobalScope;

/** Set once the database is open. Until then, and if it never opens, every call is refused. */
let db: Database | null = null;

function post(message: WorkerReply | WorkerHandshake): void {
  worker.postMessage(message);
}

worker.addEventListener('message', (event: MessageEvent<WorkerCall>) => {
  const { id, request } = event.data;
  if (db === null) {
    post({ id, ok: false, error: 'the database is not open' });
    return;
  }
  try {
    post({ id, ok: true, value: handleRequest(db, request) });
  } catch (error) {
    post({ id, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

async function open(): Promise<void> {
  const sqlite3 = await sqlite3InitModule();
  // `initialCapacity` must exceed the number of database files, with room for journals.
  const pool = await sqlite3.installOpfsSAHPoolVfs({ name: OPFS_POOL_NAME, initialCapacity: 6 });
  const database = new pool.OpfsSAHPoolDb(DATABASE_FILENAME);
  // In memory, so the schema the DDL declares is read without touching the pool or the reader's file.
  const scratch = new sqlite3.oo1.DB(':memory:');
  try {
    discardIncompatibleDatabase(database, scratch);
  } finally {
    scratch.close();
  }
  database.exec(CREATE_TABLES_SQL);
  db = database;
}

/**
 * Which of the two refusals a failed open was.
 *
 * **The name, and only the name.** `installOpfsSAHPoolVfs` rejects with the `DOMException` the pool
 * got from `createSyncAccessHandle`, and a handle refused because another tab holds it is a
 * `NoModificationAllowedError` — measured in Edge by opening a second tab of the dev server against
 * a first that already had the database, where the rejection arrives as exactly that name with no
 * `cause` beneath it. The message is not read: it is the browser's own wording and is free to be
 * translated or reworded, while the name is what the File System API specifies.
 *
 * The `cause` chain is walked anyway, a few links deep. Nothing wraps this exception today, and if
 * the pool ever starts to, the alternative to walking is silently answering `ABSENT` — which is the
 * failure this whole change exists to remove, arriving a second time.
 */
function refusalFor(error: unknown): DatabaseRefusal {
  let walk: unknown = error;
  for (let depth = 0; depth < 4 && walk !== null && walk !== undefined; depth += 1) {
    const named = walk as { name?: unknown; cause?: unknown };
    if (named.name === 'NoModificationAllowedError') return 'HELD_ELSEWHERE';
    walk = named.cause;
  }
  return 'ABSENT';
}

open().then(
  () => {
    post({ ready: true });
  },
  (error: unknown) => {
    // Reported rather than thrown: a database that will not open is an expected condition, and the
    // page has an answer for each of the two shapes it comes in. Which one decides whether that
    // answer is the localStorage fallback or a refusal to read anything at all.
    post({ ready: false, refusal: refusalFor(error) });
  },
);
