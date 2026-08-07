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

export const PROMPT_HISTORY_TABLE = 'prompt_history';
export const CUSTOM_PRESETS_TABLE = 'custom_presets';

/**
 * `IF NOT EXISTS` throughout: this runs on every boot, against a database that usually already
 * exists.
 *
 * There is no migration machinery beside it, and deliberately so — the project's standing policy is
 * that stored local data has no claim on the design, so a schema change is made here and an
 * incompatible database is discarded rather than translated.
 */
export const CREATE_TABLES_SQL = `
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
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subject_json TEXT NOT NULL,
  output_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prompt_history_created_at
  ON ${PROMPT_HISTORY_TABLE} (created_at DESC);
`;

/**
 * Where the localStorage fallback keeps its two collections.
 *
 * `sprite_gubbins_custom_presets` is deliberately the key the single-file application used, so a
 * user who had presets saved in the original still has them here.
 */
export const STORAGE_KEYS = {
  customPresets: 'sprite_gubbins_custom_presets',
  promptHistory: 'sprite_gubbins_prompt_history',
} as const;

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

export const DELETE_ALL_HISTORY_SQL = `DELETE FROM ${PROMPT_HISTORY_TABLE}`;

export const SELECT_PRESETS_SQL = `
SELECT id, name, category, subject_json, output_json, updated_at
FROM ${CUSTOM_PRESETS_TABLE}
ORDER BY updated_at DESC
`;

export const INSERT_PRESET_SQL = `
INSERT OR REPLACE INTO ${CUSTOM_PRESETS_TABLE}
  (id, name, category, subject_json, output_json, updated_at)
VALUES (?, ?, ?, ?, ?, ?)
`;

export const DELETE_PRESET_SQL = `DELETE FROM ${CUSTOM_PRESETS_TABLE} WHERE id = ?`;

export const DELETE_ALL_PRESETS_SQL = `DELETE FROM ${CUSTOM_PRESETS_TABLE}`;
