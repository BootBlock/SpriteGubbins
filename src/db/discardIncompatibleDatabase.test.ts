import sqlite3InitModule, { type Database, type Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { discardIncompatibleDatabase } from './discardIncompatibleDatabase.ts';
import { CREATE_TABLES_SQL } from './schema.ts';
import { select } from './sqliteRequests.ts';

/**
 * The boot-time discard, run against the SQLite build the worker runs, in memory.
 *
 * Each stored database is built the way an earlier release would have left it, and then booted as
 * the worker boots one. The case the discard exists for is the first one below: discarding one table
 * at a time dropped `projects` and kept the presets filed under it, so every preset named a project
 * that no longer existed.
 */

let sqlite3: Sqlite3Static;
const opened: Database[] = [];

beforeAll(async () => {
  sqlite3 = await sqlite3InitModule();
});

function database(): Database {
  const made = new sqlite3.oo1.DB(':memory:');
  opened.push(made);
  return made;
}

/** What the worker does on open: judge the stored schema against the DDL's, then run the DDL. */
function boot(stored: Database): void {
  discardIncompatibleDatabase(stored, database());
  stored.exec(CREATE_TABLES_SQL);
}

/** Which of `names` the database declares an object under. */
function declared(stored: Database, ...names: string[]): unknown[] {
  return select(stored, 'SELECT name FROM sqlite_schema ORDER BY name')
    .map((row) => (row as { name: unknown }).name)
    .filter((name) => names.includes(String(name)));
}

/** A project, a preset filed under it, a dial set filed under it and one history entry. */
function seed(stored: Database): void {
  stored.exec(`
    INSERT INTO projects (id, name, description, created_at, updated_at)
      VALUES ('harbour', 'Harbour', '', 1, 1);
    INSERT INTO custom_presets (id, project_id, name, description, category, subject_json, output_json, updated_at)
      VALUES ('custom-1', 'harbour', 'Gull', '', 'CREATURE', '{}', '{}', 1);
    INSERT INTO quantise_presets (id, project_id, name, description, dials_json, updated_at)
      VALUES ('dials-1', 'harbour', 'Crisp', '', '{}', 1);
    INSERT INTO prompt_history (id, category, prompt_text, created_at, word_count, model_used, subject_json, output_json)
      VALUES ('log-1', 'CREATURE', 'text', 1, 1, 'GENERIC', '{}', '{}');
  `);
}

function ids(stored: Database, table: string): unknown[] {
  return select(stored, `SELECT id FROM ${table} ORDER BY id`).map((row) => (row as { id: unknown }).id);
}

/** Every table the reader's library and history are kept in, and what each holds. */
function contents(stored: Database): Record<string, unknown[]> {
  return Object.fromEntries(
    ['projects', 'custom_presets', 'quantise_presets', 'prompt_history'].map((table) => [
      table,
      ids(stored, table),
    ]),
  );
}

const SEEDED = {
  projects: ['harbour'],
  custom_presets: ['custom-1'],
  quantise_presets: ['dials-1'],
  prompt_history: ['log-1'],
};

const EMPTY = { projects: [], custom_presets: [], quantise_presets: [], prompt_history: [] };

afterEach(() => {
  for (const held of opened.splice(0)) held.close();
});

describe('discardIncompatibleDatabase', () => {
  it('discards the presets with a projects table an earlier release left without a column', () => {
    const stored = database();
    stored.exec(CREATE_TABLES_SQL);
    seed(stored);
    stored.exec('ALTER TABLE projects DROP COLUMN description');

    boot(stored);

    expect(contents(stored)).toEqual(EMPTY);
  });

  it.each([
    ['a column the DDL no longer declares', 'ALTER TABLE custom_presets ADD COLUMN colour TEXT'],
    ['a table the DDL no longer declares', 'CREATE TABLE sheets (id TEXT PRIMARY KEY)'],
    ['an index the DDL no longer declares', 'CREATE INDEX idx_presets_name ON custom_presets (name)'],
    ['a view the DDL never declared', 'CREATE VIEW every_project AS SELECT id FROM projects'],
  ])('discards the whole database over %s', (_, change) => {
    const stored = database();
    stored.exec(CREATE_TABLES_SQL);
    seed(stored);
    stored.exec(change);

    boot(stored);

    expect(contents(stored)).toEqual(EMPTY);
    expect(declared(stored, 'sheets', 'idx_presets_name', 'every_project')).toEqual([]);
  });

  it.each([
    ['a column that changed type', 'word_count INTEGER NOT NULL', 'word_count TEXT NOT NULL'],
    [
      'a column made unique',
      'name TEXT NOT NULL,\n  description',
      'name TEXT NOT NULL UNIQUE,\n  description',
    ],
    ['a column given a collation', 'model_used TEXT NOT NULL', 'model_used TEXT NOT NULL COLLATE NOCASE'],
    [
      'a check on a column',
      'word_count INTEGER NOT NULL',
      'word_count INTEGER NOT NULL CHECK (word_count >= 0)',
    ],
    ['an index in the other direction', '(created_at DESC)', '(created_at ASC)'],
    [
      'columns declared in another order',
      'id TEXT PRIMARY KEY,\n  name TEXT NOT NULL,',
      'name TEXT NOT NULL,\n  id TEXT PRIMARY KEY,',
    ],
  ])('discards the whole database made by a DDL with %s', (_, current, earlier) => {
    const ddl = CREATE_TABLES_SQL.replace(current, earlier);
    expect(ddl).not.toBe(CREATE_TABLES_SQL);
    const stored = database();
    stored.exec(ddl);
    seed(stored);

    boot(stored);

    expect(contents(stored)).toEqual(EMPTY);
  });

  it('keeps a database the DDL made, and keeps it on every boot after', () => {
    const stored = database();
    stored.exec(CREATE_TABLES_SQL);
    seed(stored);

    boot(stored);
    boot(stored);

    expect(contents(stored)).toEqual(SEEDED);
  });

  it('keeps a database that lacks a table the DDL now adds, and makes that table', () => {
    const stored = database();
    stored.exec(CREATE_TABLES_SQL);
    seed(stored);
    stored.exec('DROP TABLE studio_session');

    boot(stored);

    expect(contents(stored)).toEqual(SEEDED);
    expect(declared(stored, 'studio_session')).toEqual(['studio_session']);
  });

  it('keeps a database made by the same DDL laid out differently', () => {
    // Every column on one line, and space on both sides of every bracket and comma: nothing about the
    // schema has changed, so nothing about the library may.
    const reflowed = CREATE_TABLES_SQL.replaceAll('\n  ', ' ').replace(/([(),])/g, ' $1 ');
    expect(reflowed).not.toContain('\n  id');
    const stored = database();
    stored.exec(reflowed);
    seed(stored);

    boot(stored);

    expect(contents(stored)).toEqual(SEEDED);
  });

  it('leaves an empty database for the DDL to fill', () => {
    const stored = database();

    boot(stored);

    expect(contents(stored)).toEqual(EMPTY);
  });
});
