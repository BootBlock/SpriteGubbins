import type { Database } from '@sqlite.org/sqlite-wasm';
import { HISTORY_LIMIT } from './backend.ts';
import {
  DELETE_ALL_HISTORY_SQL,
  DELETE_ALL_PRESETS_SQL,
  DELETE_ALL_QUANTISE_PRESETS_SQL,
  DELETE_HISTORY_SQL,
  DELETE_PRESET_SQL,
  DELETE_QUANTISE_PRESET_SQL,
  INSERT_HISTORY_SQL,
  INSERT_PRESET_SQL,
  INSERT_QUANTISE_PRESET_SQL,
  PROMPT_HISTORY_TABLE,
  SELECT_HISTORY_SQL,
  SELECT_PRESETS_SQL,
  SELECT_QUANTISE_PRESETS_SQL,
  SELECT_SESSION_SQL,
  SELECT_SETTINGS_SQL,
  UPSERT_SESSION_SQL,
  UPSERT_SETTINGS_SQL,
} from './schema.ts';
import type { WorkerCall } from './workerProtocol.ts';

/**
 * Every persistence request as SQL, against a database that is already open.
 *
 * The other half of `sqliteWorker.ts`, and a separate responsibility from it: that file is a
 * *thread* — it installs the VFS, discards an incompatible schema, opens the database and answers
 * the message port — and this is what the app is actually asking for. It is the same line
 * CLAUDE.md draws for `src/workers/`, applied inside the persistence layer, where the worker stays
 * because it *is* that layer rather than a thread something else was moved onto.
 *
 * Nothing here posts a message, holds the handle or knows a request has an id. It takes an open
 * `Database` and a request and returns a plain value, so a caller can run one without a worker at
 * all — which is what makes the switch readable next to `schema.ts` rather than buried under the
 * lifecycle that happens to invoke it.
 */

/** Rows from a SELECT, as plain objects for `db/rows.ts` on the other side to validate. */
export function select(database: Database, sql: string): unknown[] {
  return database.exec(sql, { rowMode: 'object', returnValue: 'resultRows' });
}

export function handleRequest(database: Database, request: WorkerCall['request']): unknown {
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

    case 'deleteHistoryLog':
      database.exec(DELETE_HISTORY_SQL, { bind: [request.logId] });
      return undefined;

    case 'clearHistoryLogs':
      database.exec(DELETE_ALL_HISTORY_SQL);
      return undefined;

    case 'savePreset': {
      const { preset } = request;
      database.exec(INSERT_PRESET_SQL, {
        bind: [
          preset.id,
          preset.name,
          preset.description,
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
              preset.description,
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

    case 'saveQuantisePreset': {
      const { preset } = request;
      database.exec(INSERT_QUANTISE_PRESET_SQL, {
        bind: [preset.id, preset.name, preset.description, JSON.stringify(preset.dials), Date.now()],
      });
      return undefined;
    }

    case 'listQuantisePresets':
      return select(database, SELECT_QUANTISE_PRESETS_SQL);

    case 'deleteQuantisePreset':
      database.exec(DELETE_QUANTISE_PRESET_SQL, { bind: [request.presetId] });
      return undefined;

    case 'replaceQuantisePresets': {
      // One transaction, as `replacePresets` above is and for the same reason: an import that
      // failed halfway would leave part of the old collection and part of the new, with nothing to
      // say which rows were which.
      database.exec('BEGIN');
      try {
        database.exec(DELETE_ALL_QUANTISE_PRESETS_SQL);
        // One instant for every row, so an imported collection arrives in the order the file lists
        // it rather than in one the clock decided between inserts. `SELECT … ORDER BY updated_at
        // DESC` then leaves that order to SQLite's own tie-breaking, which is the same answer the
        // fallback gives: a pack is a collection, not a sequence of saves.
        const updatedAt = Date.now();
        for (const preset of request.presets) {
          database.exec(INSERT_QUANTISE_PRESET_SQL, {
            bind: [preset.id, preset.name, preset.description, JSON.stringify(preset.dials), updatedAt],
          });
        }
        database.exec('COMMIT');
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
      return undefined;
    }

    // The row itself, not a list: `db/rows.ts` on the other side turns it — or its absence — into a
    // settings object, which is where every other row shape is interpreted too.
    case 'loadSettings':
      return select(database, SELECT_SETTINGS_SQL).at(0);

    case 'saveSettings':
      database.exec(UPSERT_SETTINGS_SQL, { bind: [JSON.stringify(request.settings)] });
      return undefined;

    // The row itself again, not a list — `db/rows.ts` turns it, or its absence, into a session.
    case 'loadSession':
      return select(database, SELECT_SESSION_SQL).at(0);

    case 'saveSession': {
      const { session } = request;
      database.exec(UPSERT_SESSION_SQL, {
        bind: [session.category, JSON.stringify(session.subject), JSON.stringify(session.output)],
      });
      return undefined;
    }
  }
}
