import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import type { PromptHistoryLog } from '../types/history.ts';
import type { PresetArchetype } from '../types/preset.ts';
import { HISTORY_LIMIT, type PersistenceBackend } from './backend.ts';
import { parseHistoryRow, parsePresetRow } from './rows.ts';
import {
  CREATE_TABLES_SQL,
  DATABASE_FILENAME,
  DELETE_ALL_HISTORY_SQL,
  DELETE_ALL_PRESETS_SQL,
  DELETE_PRESET_SQL,
  INSERT_HISTORY_SQL,
  INSERT_PRESET_SQL,
  OPFS_POOL_NAME,
  PROMPT_HISTORY_TABLE,
  SELECT_HISTORY_SQL,
  SELECT_PRESETS_SQL,
} from './schema.ts';

/**
 * SQLite (WebAssembly) persisted to the Origin Private File System.
 *
 * Uses the **SAH-pool VFS** rather than the plain `OpfsDb`. That is a deliberate choice: the
 * standard OPFS VFS blocks on `Atomics.wait`, which browsers forbid on the main thread, so it
 * can only run inside a Worker. The SAH pool acquires its synchronous access handles up front
 * and therefore works on the main thread — no worker, no RPC bridge, no message plumbing for a
 * database this app queries a handful of times per session.
 *
 * Construction is via {@link openSqliteBackend}, which resolves to `null` rather than throwing
 * when OPFS is unavailable — a private window, an unsupported browser, an exhausted quota — so
 * `database.ts` can fall back to localStorage.
 */
export class SqliteBackend implements PersistenceBackend {
  readonly kind = 'sqlite-opfs' as const;

  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /** Rows from a SELECT, as plain objects for `rows.ts` to validate. */
  private select(sql: string): unknown[] {
    return this.db.exec(sql, { rowMode: 'object', returnValue: 'resultRows' });
  }

  addHistoryLog(log: PromptHistoryLog): Promise<void> {
    this.db.exec(INSERT_HISTORY_SQL, {
      bind: [log.id, log.category, log.promptText, log.createdAt, log.wordCount, log.modelUsed],
    });
    // Trim in the same call rather than on read, so the table cannot grow without bound across
    // sessions. `OFFSET` counts from the newest, so this deletes everything past the limit.
    this.db.exec(
      `DELETE FROM ${PROMPT_HISTORY_TABLE} WHERE id NOT IN (
         SELECT id FROM ${PROMPT_HISTORY_TABLE} ORDER BY created_at DESC LIMIT ?
       )`,
      { bind: [HISTORY_LIMIT] },
    );
    return Promise.resolve();
  }

  listHistoryLogs(): Promise<PromptHistoryLog[]> {
    const logs = this.select(SELECT_HISTORY_SQL)
      .map(parseHistoryRow)
      .filter((log): log is PromptHistoryLog => log !== null);
    return Promise.resolve(logs);
  }

  clearHistoryLogs(): Promise<void> {
    this.db.exec(DELETE_ALL_HISTORY_SQL);
    return Promise.resolve();
  }

  savePreset(preset: PresetArchetype): Promise<void> {
    this.db.exec(INSERT_PRESET_SQL, {
      bind: [
        preset.id,
        preset.name,
        preset.category,
        JSON.stringify(preset.subject),
        JSON.stringify(preset.output),
        Date.now(),
      ],
    });
    return Promise.resolve();
  }

  listPresets(): Promise<PresetArchetype[]> {
    const presets = this.select(SELECT_PRESETS_SQL)
      .map(parsePresetRow)
      .filter((preset): preset is PresetArchetype => preset !== null);
    return Promise.resolve(presets);
  }

  deletePreset(id: string): Promise<void> {
    this.db.exec(DELETE_PRESET_SQL, { bind: [id] });
    return Promise.resolve();
  }

  replacePresets(presets: readonly PresetArchetype[]): Promise<void> {
    // One transaction: an import that failed halfway would otherwise leave the user with part
    // of the old collection and part of the new, and no way to tell which.
    this.db.exec('BEGIN');
    try {
      this.db.exec(DELETE_ALL_PRESETS_SQL);
      const updatedAt = Date.now();
      for (const preset of presets) {
        this.db.exec(INSERT_PRESET_SQL, {
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
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    return Promise.resolve();
  }
}

/**
 * Bring up SQLite on OPFS, or report that it isn't available.
 *
 * Returns `null` — rather than throwing — for every failure mode, because none of them is an
 * error the app should surface: OPFS being blocked is an expected condition on a first,
 * not-yet-isolated page load and in private browsing, and the answer is always the same
 * (use localStorage instead).
 */
export async function openSqliteBackend(): Promise<SqliteBackend | null> {
  try {
    const sqlite3 = await sqlite3InitModule();
    // `initialCapacity` must exceed the number of database files, with room for journals.
    const pool = await sqlite3.installOpfsSAHPoolVfs({
      name: OPFS_POOL_NAME,
      initialCapacity: 6,
    });
    const db = new pool.OpfsSAHPoolDb(DATABASE_FILENAME);
    db.exec(CREATE_TABLES_SQL);
    return new SqliteBackend(db);
  } catch {
    return null;
  }
}
