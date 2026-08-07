/// <reference lib="webworker" />
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { HISTORY_LIMIT } from './backend.ts';
import {
  CREATE_TABLES_SQL,
  DATABASE_FILENAME,
  DELETE_ALL_HISTORY_SQL,
  DELETE_ALL_PRESETS_SQL,
  DELETE_PRESET_SQL,
  INSERT_HISTORY_SQL,
  INSERT_PRESET_SQL,
  MIGRATIONS,
  OPFS_POOL_NAME,
  PROMPT_HISTORY_TABLE,
  SELECT_HISTORY_SQL,
  SELECT_PRESETS_SQL,
} from './schema.ts';
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

/** Rows from a SELECT, as plain objects for `db/rows.ts` on the other side to validate. */
function select(database: Database, sql: string): unknown[] {
  return database.exec(sql, { rowMode: 'object', returnValue: 'resultRows' });
}

function handle(database: Database, request: WorkerCall['request']): unknown {
  switch (request.kind) {
    case 'addHistoryLog': {
      const { log } = request;
      database.exec(INSERT_HISTORY_SQL, {
        bind: [
          log.id,
          log.category,
          log.promptText,
          log.createdAt,
          log.wordCount,
          log.modelUsed,
          JSON.stringify(log.subject),
          JSON.stringify(log.output),
        ],
      });
      // Trimmed on write rather than on read, so the table cannot grow without bound across
      // sessions. `LIMIT` counts from the newest, so this deletes everything past it.
      database.exec(
        `DELETE FROM ${PROMPT_HISTORY_TABLE} WHERE id NOT IN (
           SELECT id FROM ${PROMPT_HISTORY_TABLE} ORDER BY created_at DESC LIMIT ?
         )`,
        { bind: [HISTORY_LIMIT] },
      );
      return undefined;
    }

    case 'listHistoryLogs':
      return select(database, SELECT_HISTORY_SQL);

    case 'clearHistoryLogs':
      database.exec(DELETE_ALL_HISTORY_SQL);
      return undefined;

    case 'savePreset': {
      const { preset } = request;
      database.exec(INSERT_PRESET_SQL, {
        bind: [
          preset.id,
          preset.name,
          preset.category,
          JSON.stringify(preset.subject),
          JSON.stringify(preset.output),
          Date.now(),
        ],
      });
      return undefined;
    }

    case 'listPresets':
      return select(database, SELECT_PRESETS_SQL);

    case 'deletePreset':
      database.exec(DELETE_PRESET_SQL, { bind: [request.presetId] });
      return undefined;

    case 'replacePresets': {
      // One transaction: an import that failed halfway would otherwise leave part of the old
      // collection and part of the new, with no way to tell which.
      database.exec('BEGIN');
      try {
        database.exec(DELETE_ALL_PRESETS_SQL);
        const updatedAt = Date.now();
        for (const preset of request.presets) {
          database.exec(INSERT_PRESET_SQL, {
            bind: [
              preset.id,
              preset.name,
              preset.category,
              JSON.stringify(preset.subject),
              JSON.stringify(preset.output),
              updatedAt,
            ],
          });
        }
        database.exec('COMMIT');
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
      return undefined;
    }
  }
}

worker.addEventListener('message', (event: MessageEvent<WorkerCall>) => {
  const { id, request } = event.data;
  if (db === null) {
    post({ id, ok: false, error: 'the database is not open' });
    return;
  }
  try {
    post({ id, ok: true, value: handle(db, request) });
  } catch (error) {
    post({ id, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

async function open(): Promise<void> {
  const sqlite3 = await sqlite3InitModule();
  // `initialCapacity` must exceed the number of database files, with room for journals.
  const pool = await sqlite3.installOpfsSAHPoolVfs({ name: OPFS_POOL_NAME, initialCapacity: 6 });
  const database = new pool.OpfsSAHPoolDb(DATABASE_FILENAME);
  database.exec(CREATE_TABLES_SQL);
  for (const migration of MIGRATIONS) {
    try {
      database.exec(migration);
    } catch {
      // Already applied. SQLite has no `ADD COLUMN IF NOT EXISTS`, so "duplicate column name" is
      // how it reports that, and it is the expected outcome on every boot after the first.
    }
  }
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
