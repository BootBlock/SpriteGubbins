/// <reference lib="webworker" />
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import {
  CREATE_TABLES_SQL,
  DATABASE_FILENAME,
  DROP_TABLE_SQL,
  OPFS_POOL_NAME,
  TABLE_COLUMNS,
  TABLE_INFO_SQL,
} from './schema.ts';
import { handleRequest, select } from './sqliteRequests.ts';
import type { WorkerCall, WorkerHandshake, WorkerReply } from './workerProtocol.ts';

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

/**
 * Drop any stored table whose columns are not the ones the DDL now declares.
 *
 * This runs **before** `CREATE_TABLES_SQL` and is what makes that DDL's `IF NOT EXISTS` safe to
 * change: on its own, adding a column leaves an existing database with the old table and every
 * statement naming the new column failing for the life of that database. `TABLE_COLUMNS` in
 * `schema.ts` says why this is a discard rather than a migration, and what it costs.
 *
 * A table that is absent is left alone — there is nothing to discard, and the DDL below is about to
 * create it. Compared as a set both ways, so a column *removed* from the DDL is as much a mismatch
 * as one added: a stale column would otherwise survive every future boot, still holding data the app
 * no longer has a name for.
 */
function discardIncompatibleTables(database: Database): void {
  for (const [table, columns] of Object.entries(TABLE_COLUMNS)) {
    const stored = select(database, TABLE_INFO_SQL(table))
      .map((row) => (row !== null && typeof row === 'object' ? (row as { name?: unknown }).name : undefined))
      .filter((name): name is string => typeof name === 'string');

    if (stored.length === 0) continue;

    const present = new Set(stored);
    if (present.size === columns.length && columns.every((column) => present.has(column))) continue;

    database.exec(DROP_TABLE_SQL(table));
  }
}

async function open(): Promise<void> {
  const sqlite3 = await sqlite3InitModule();
  // `initialCapacity` must exceed the number of database files, with room for journals.
  const pool = await sqlite3.installOpfsSAHPoolVfs({ name: OPFS_POOL_NAME, initialCapacity: 6 });
  const database = new pool.OpfsSAHPoolDb(DATABASE_FILENAME);
  discardIncompatibleTables(database);
  database.exec(CREATE_TABLES_SQL);
  db = database;
}

open().then(
  () => {
    post({ ready: true });
  },
  () => {
    // Reported rather than thrown: OPFS being unavailable is an expected condition in a private
    // window or a browser without it, and the answer is always the same — the page falls back to
    // localStorage.
    post({ ready: false });
  },
);
