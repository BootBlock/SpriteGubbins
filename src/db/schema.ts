/**
 * The database's data definition, in one place.
 *
 * Both backends are held to this shape: the SQLite backend runs the DDL below, and the
 * localStorage fallback stores objects with exactly the same fields under the keys here. Keeping
 * them aligned is what lets the rest of the app be indifferent to which one it got.
 *
 * Column names are `snake_case` because they are SQL; the domain types they map to are
 * `camelCase`. `db/rows.ts` owns that translation, so it happens in exactly one place.
 */

export const DATABASE_FILENAME = '/sprite-gubbins.sqlite3';

/** The OPFS SAH pool this app's database lives in. Namespaced so it can't collide. */
export const OPFS_POOL_NAME = 'sprite-gubbins-pool';

export const PROJECTS_TABLE = 'projects';
export const PROMPT_HISTORY_TABLE = 'prompt_history';
export const CUSTOM_PRESETS_TABLE = 'custom_presets';
export const APP_SETTINGS_TABLE = 'app_settings';
export const STUDIO_SESSION_TABLE = 'studio_session';
export const QUANTISE_PRESETS_TABLE = 'quantise_presets';

/**
 * The settings table holds exactly one row, and this is its key.
 *
 * A single-row table rather than a key/value one: the settings are read and written as a whole
 * object — the store hydrates all four at once and every action rewrites the set — so a row per
 * preference would be four statements doing one job, and would let a partial write leave the app
 * with two settings from one session and two from another. The `CHECK` in the DDL is what makes
 * "exactly one" a property of the schema rather than a habit of the code above it.
 */
export const SETTINGS_ROW_ID = 1;

/**
 * The session table holds exactly one row, and this is its key.
 *
 * Single-row for the same reason the settings table is, and one more of its own: there is only ever
 * one studio, so "the session" is a definite article rather than a collection with one member in it.
 * A `CHECK` makes that a property of the schema. The three parts go in **one row** rather than three
 * because they are written together — a subject and the category it was written for are meaningless
 * apart, and a partial write would restore answers into the wrong form.
 */
export const SESSION_ROW_ID = 1;

/**
 * `IF NOT EXISTS` throughout: this runs on every boot, against a database that usually already
 * exists.
 *
 * There is no migration machinery beside it, and deliberately so — the project's standing policy is
 * that stored local data has no claim on the design, so a schema change is made here and an
 * incompatible database is discarded rather than translated.
 */
export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS ${PROJECTS_TABLE} (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ${PROMPT_HISTORY_TABLE} (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  word_count INTEGER NOT NULL,
  model_used TEXT NOT NULL,
  subject_json TEXT NOT NULL DEFAULT '{}',
  output_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS ${CUSTOM_PRESETS_TABLE} (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  subject_json TEXT NOT NULL,
  output_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ${APP_SETTINGS_TABLE} (
  id INTEGER PRIMARY KEY CHECK (id = ${SETTINGS_ROW_ID}),
  settings_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ${STUDIO_SESSION_TABLE} (
  id INTEGER PRIMARY KEY CHECK (id = ${SESSION_ROW_ID}),
  category TEXT NOT NULL,
  subject_json TEXT NOT NULL,
  output_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ${QUANTISE_PRESETS_TABLE} (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  dials_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prompt_history_created_at
  ON ${PROMPT_HISTORY_TABLE} (created_at DESC);
`;

/**
 * The columns each table above declares, as a set the worker can compare a *stored* table against.
 *
 * `CREATE TABLE IF NOT EXISTS` runs against a database that usually already exists, and it does
 * nothing at all when the table is there — so adding a column to the DDL leaves every existing
 * install with the old table, and the first `SELECT` naming the new column fails with
 * "no such column" for as long as that database lives. Nothing about that is loud: the stores catch
 * a failed read and raise a toast, so the symptom is a collection that is permanently empty and a
 * save that is permanently refused.
 *
 * This is what makes the file's own rule — *an incompatible database is discarded rather than
 * translated* — something the code actually does. The worker reads `PRAGMA table_info` for each
 * table on boot, drops any whose columns are not exactly this set, and lets the DDL rebuild it. That
 * is a discard and not a migration: there is no version column, no upgrade step and no translation
 * of a stored row into a newer shape, and the data in a table that no longer matches is gone rather
 * than repaired. Pre-1.0 that is the bargain, and it is the same one `db/configParsers.ts` makes.
 *
 * Written out rather than parsed back out of the DDL, because a regular expression over SQL is a
 * second thing to get wrong. `schema.test.ts` extracts the columns from `CREATE_TABLES_SQL` and
 * fails unless the two agree, so the drift this would otherwise invite is caught at build time.
 */
export const TABLE_COLUMNS = {
  [PROJECTS_TABLE]: ['id', 'name', 'description', 'created_at', 'updated_at'],
  [PROMPT_HISTORY_TABLE]: [
    'id',
    'category',
    'prompt_text',
    'created_at',
    'word_count',
    'model_used',
    'subject_json',
    'output_json',
  ],
  [CUSTOM_PRESETS_TABLE]: [
    'id',
    'project_id',
    'name',
    'description',
    'category',
    'subject_json',
    'output_json',
    'updated_at',
  ],
  [APP_SETTINGS_TABLE]: ['id', 'settings_json'],
  [STUDIO_SESSION_TABLE]: ['id', 'category', 'subject_json', 'output_json'],
  [QUANTISE_PRESETS_TABLE]: ['id', 'project_id', 'name', 'description', 'dials_json', 'updated_at'],
} as const satisfies Record<string, readonly string[]>;

/** What the stored table's columns are read with, and what a mismatched one is dropped by. */
export const TABLE_INFO_SQL = (table: string) => `PRAGMA table_info(${table})`;
export const DROP_TABLE_SQL = (table: string) => `DROP TABLE IF EXISTS ${table}`;

/**
 * Where the localStorage fallback keeps each of the tables above.
 *
 * `sprite_gubbins_custom_presets` is the key the single-file application used, and the rest are
 * named to match it. **The key is inherited; the collection under it is not.** The original stored
 * its archetypes as nested objects, and this fallback did too for as long as it read them with
 * `parseImportedPreset`. It now stores every collection in the SQLite table's own `snake_case` row
 * shape, so one parser reads a row from either backend — which is what makes the two accept the
 * same stored collection and list it in the same order. A collection written in the older nested
 * shape no longer parses and is discarded, which is the pre-1.0 policy rather than an oversight:
 * see CLAUDE.md, “No backwards compatibility before 1.0.0”.
 */
export const STORAGE_KEYS = {
  projects: 'sprite_gubbins_projects',
  customPresets: 'sprite_gubbins_custom_presets',
  promptHistory: 'sprite_gubbins_prompt_history',
  appSettings: 'sprite_gubbins_app_settings',
  studioSession: 'sprite_gubbins_studio_session',
  quantisePresets: 'sprite_gubbins_quantise_presets',
} as const;

/**
 * Every project, most recently edited first.
 *
 * The same ordering the two preset collections use, and for the reason given there: a reader who
 * has just renamed or made one is looking for it. `updated_at` moves only when the project’s own
 * name or description changes — saving a preset into a project does not touch it — so the list is
 * stable while somebody is working inside a project rather than reshuffling under them.
 */
export const SELECT_PROJECTS_SQL = `
SELECT id, name, description, created_at, updated_at
FROM ${PROJECTS_TABLE}
ORDER BY updated_at DESC
`;

/**
 * Write one, replacing whatever stood under that id.
 *
 * `INSERT OR REPLACE` against the project’s own GUID, so making a project and renaming one are the
 * same statement — which is what lets the store decide between them by *reusing the id*, and is
 * what makes a rename incapable of changing the thing every preset refers to.
 */
export const INSERT_PROJECT_SQL = `
INSERT OR REPLACE INTO ${PROJECTS_TABLE} (id, name, description, created_at, updated_at)
VALUES (?, ?, ?, ?, ?)
`;

export const DELETE_PROJECT_SQL = `DELETE FROM ${PROJECTS_TABLE} WHERE id = ?`;

/**
 * The two statements that make deleting a project delete what is in it.
 *
 * The cascade is written here rather than declared with `REFERENCES … ON DELETE CASCADE`, because
 * SQLite enforces foreign keys only where `PRAGMA foreign_keys = ON` is set on the connection —
 * it is off by default, and a constraint that is silently not enforced is worse than none. The
 * worker runs these three inside one transaction instead, which the localStorage fallback matches
 * by rewriting both collections; see `sqliteRequests.ts`.
 */
export const DELETE_PRESETS_BY_PROJECT_SQL = `DELETE FROM ${CUSTOM_PRESETS_TABLE} WHERE project_id = ?`;
export const DELETE_QUANTISE_PRESETS_BY_PROJECT_SQL = `DELETE FROM ${QUANTISE_PRESETS_TABLE} WHERE project_id = ?`;

/** Empty the collection — the first third of importing a library pack. */
export const DELETE_ALL_PROJECTS_SQL = `DELETE FROM ${PROJECTS_TABLE}`;

/** Newest first — the order the history drawer lists entries in. */
export const SELECT_HISTORY_SQL = `
SELECT id, category, prompt_text, created_at, word_count, model_used, subject_json, output_json
FROM ${PROMPT_HISTORY_TABLE}
ORDER BY created_at DESC
`;

export const INSERT_HISTORY_SQL = `
INSERT OR REPLACE INTO ${PROMPT_HISTORY_TABLE}
  (id, category, prompt_text, created_at, word_count, model_used, subject_json, output_json)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`;

/** One entry, by id — what the drawer's per-entry delete runs. */
export const DELETE_HISTORY_SQL = `DELETE FROM ${PROMPT_HISTORY_TABLE} WHERE id = ?`;

/** Every entry — what "Clear history" runs. Note the `ALL`: this one takes no id and spares none. */
export const DELETE_ALL_HISTORY_SQL = `DELETE FROM ${PROMPT_HISTORY_TABLE}`;

export const SELECT_PRESETS_SQL = `
SELECT id, project_id, name, description, category, subject_json, output_json, updated_at
FROM ${CUSTOM_PRESETS_TABLE}
ORDER BY updated_at DESC
`;

export const INSERT_PRESET_SQL = `
INSERT OR REPLACE INTO ${CUSTOM_PRESETS_TABLE}
  (id, project_id, name, description, category, subject_json, output_json, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`;

export const DELETE_PRESET_SQL = `DELETE FROM ${CUSTOM_PRESETS_TABLE} WHERE id = ?`;

export const DELETE_ALL_PRESETS_SQL = `DELETE FROM ${CUSTOM_PRESETS_TABLE}`;

/** The one settings row, or nothing at all on an install that has never opened the dialog. */
export const SELECT_SETTINGS_SQL = `
SELECT settings_json FROM ${APP_SETTINGS_TABLE} WHERE id = ${SETTINGS_ROW_ID}
`;

/**
 * Write the settings, replacing whatever was there.
 *
 * `INSERT OR REPLACE` against the fixed key, so the first save and every later one are the same
 * statement — there is no "have they saved before" question for the caller to get wrong.
 */
export const UPSERT_SETTINGS_SQL = `
INSERT OR REPLACE INTO ${APP_SETTINGS_TABLE} (id, settings_json) VALUES (${SETTINGS_ROW_ID}, ?)
`;

/** The one session row, or nothing at all on a first visit. */
export const SELECT_SESSION_SQL = `
SELECT category, subject_json, output_json FROM ${STUDIO_SESSION_TABLE} WHERE id = ${SESSION_ROW_ID}
`;

/**
 * Write the session, replacing whatever was there.
 *
 * `INSERT OR REPLACE` against the fixed key, so the first save and every later one are the same
 * statement — the caller never has to know whether a session has been stored before.
 */
export const UPSERT_SESSION_SQL = `
INSERT OR REPLACE INTO ${STUDIO_SESSION_TABLE} (id, category, subject_json, output_json)
VALUES (${SESSION_ROW_ID}, ?, ?, ?)
`;

/**
 * The quantiser's saved dial positions, newest first.
 *
 * The same ordering the archetypes use, and the same reason: a reader who has just saved one is
 * looking for it, and a collection that grew over months is otherwise in an order nothing on screen
 * explains.
 */
export const SELECT_QUANTISE_PRESETS_SQL = `
SELECT id, project_id, name, description, dials_json, updated_at
FROM ${QUANTISE_PRESETS_TABLE}
ORDER BY updated_at DESC
`;

/**
 * Write one, replacing whatever stood under that id.
 *
 * `INSERT OR REPLACE`, so saving under a name already in the library is the same statement as
 * saving a new one — which is what lets the store decide the question by *reusing the id* rather
 * than by asking storage whether the preset exists.
 */
export const INSERT_QUANTISE_PRESET_SQL = `
INSERT OR REPLACE INTO ${QUANTISE_PRESETS_TABLE}
  (id, project_id, name, description, dials_json, updated_at)
VALUES (?, ?, ?, ?, ?, ?)
`;

export const DELETE_QUANTISE_PRESET_SQL = `DELETE FROM ${QUANTISE_PRESETS_TABLE} WHERE id = ?`;

/**
 * Empty the collection — the first half of importing a pack of dial positions.
 *
 * Beside {@link DELETE_ALL_PRESETS_SQL} and for the same reason: an import *replaces* what is
 * stored rather than merging into it, so the delete and the inserts that follow are one
 * transaction. See the `replaceQuantisePresets` case in `sqliteWorker.ts`.
 */
export const DELETE_ALL_QUANTISE_PRESETS_SQL = `DELETE FROM ${QUANTISE_PRESETS_TABLE}`;
