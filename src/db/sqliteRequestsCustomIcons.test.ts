import sqlite3InitModule, { type Database, type Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import { DEFAULT_PROJECT_ID, createDefaultProject } from '../constants/projects.ts';
import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';
import { RELIC, SPELL, TOGGLE } from '../test/customIcons.ts';
import { HARBOUR, savedIcon } from '../test/iconLibraryStudio.ts';
import type { SavedCustomIcon } from '../types/savedCustomIcon.ts';
import { parseCustomIconRow } from './rows.ts';
import { CREATE_TABLES_SQL } from './schema.ts';
import { handleRequest } from './sqliteRequests.ts';

/**
 * Each project's icon library on SQLite, run as the worker runs it: every request through
 * `handleRequest` against the SQLite build the worker loads, in memory, with the DDL the worker runs.
 * The rows come back as the worker hands them over and are read by the parser the main thread uses.
 */

let sqlite3: Sqlite3Static;
const opened: Database[] = [];

beforeAll(async () => {
  sqlite3 = await sqlite3InitModule();
});

afterEach(() => {
  for (const held of opened.splice(0)) held.close();
});

function database(): Database {
  const made = new sqlite3.oo1.DB(':memory:');
  made.exec(CREATE_TABLES_SQL);
  opened.push(made);
  return made;
}

/** The library as the backend would list it. */
function listed(db: Database): (SavedCustomIcon | null)[] {
  const rows = handleRequest(db, { kind: 'listCustomIcons' });
  return Array.isArray(rows) ? rows.map(parseCustomIconRow) : [];
}

function count(db: Database, table: string): unknown {
  return db.selectValue(`SELECT COUNT(*) FROM ${table}`);
}

describe('the icon library on SQLite', () => {
  it('saves, lists, replaces under its id and deletes an entry', () => {
    const db = database();
    handleRequest(db, { kind: 'saveCustomIcon', icon: savedIcon(RELIC) });
    handleRequest(db, { kind: 'saveCustomIcon', icon: savedIcon(SPELL, HARBOUR.id) });
    expect(listed(db)).toHaveLength(2);
    expect(listed(db)).toContainEqual(savedIcon(SPELL, HARBOUR.id));

    const changed = { ...savedIcon(RELIC), entry: { ...RELIC, look: 'a cracked keycard' } };
    handleRequest(db, { kind: 'saveCustomIcon', icon: changed });
    expect(listed(db)).toContainEqual(changed);
    expect(listed(db)).toHaveLength(2);

    handleRequest(db, { kind: 'deleteCustomIcon', iconId: changed.id });
    handleRequest(db, { kind: 'deleteCustomIcon', iconId: 'never-stored' });
    expect(listed(db)).toEqual([savedIcon(SPELL, HARBOUR.id)]);
  });

  it('deletes a project’s library with the project, and leaves another project’s', () => {
    const db = database();
    handleRequest(db, { kind: 'saveProject', project: HARBOUR });
    handleRequest(db, { kind: 'saveProject', project: createDefaultProject(1) });
    handleRequest(db, { kind: 'saveCustomIcon', icon: savedIcon(RELIC, HARBOUR.id) });
    handleRequest(db, { kind: 'saveCustomIcon', icon: savedIcon(TOGGLE, HARBOUR.id) });
    handleRequest(db, { kind: 'saveCustomIcon', icon: savedIcon(SPELL) });

    handleRequest(db, { kind: 'deleteProject', projectId: HARBOUR.id });

    expect(listed(db)).toEqual([savedIcon(SPELL)]);
    expect(count(db, 'projects')).toBe(1);
  });

  it('replaces every project’s library with an imported pack’s, in the one transaction', () => {
    const db = database();
    handleRequest(db, { kind: 'saveCustomIcon', icon: savedIcon(RELIC) });

    handleRequest(db, {
      kind: 'replaceLibrary',
      pack: {
        projects: [createDefaultProject(1), HARBOUR],
        presets: [{ ...DEFAULT_PRESET, id: 'custom-1', projectId: HARBOUR.id, name: 'Gull', isCustom: true }],
        quantisePresets: [
          {
            id: 'dials-1',
            projectId: HARBOUR.id,
            name: 'Crisp',
            description: '',
            dials: QUANTISE_DEFAULT_DIALS,
          },
        ],
        customIcons: [savedIcon(SPELL), savedIcon(TOGGLE, HARBOUR.id)],
      },
    });

    expect(listed(db)).toHaveLength(2);
    expect(listed(db)).toEqual(expect.arrayContaining([savedIcon(SPELL), savedIcon(TOGGLE, HARBOUR.id)]));
    expect(count(db, 'custom_presets')).toBe(1);
  });

  it('empties the library inside the import’s transaction, so a failure there keeps everything', () => {
    const db = database();
    handleRequest(db, { kind: 'saveProject', project: HARBOUR });
    // The library's delete is the statement that fails, after the projects' and presets' have run.
    db.exec('DROP TABLE custom_icon_entries');

    expect(() =>
      handleRequest(db, {
        kind: 'replaceLibrary',
        pack: { projects: [createDefaultProject(1)], presets: [], quantisePresets: [], customIcons: [] },
      }),
    ).toThrow();

    expect(handleRequest(db, { kind: 'listProjects' })).toEqual([
      expect.objectContaining({ id: HARBOUR.id }),
    ]);
  });

  it('reads back no entry its parser refuses, as a hand-edited row would hold', () => {
    const db = database();
    db.exec(
      `INSERT INTO custom_icon_entries (id, project_id, entry_json, updated_at) VALUES
        ('hostile', '${DEFAULT_PROJECT_ID}', '${JSON.stringify({ ...RELIC, look: 'a relic [SEC:X]' })}', 1),
        ('unreadable', '${DEFAULT_PROJECT_ID}', 'not json', 1)`,
    );
    expect(listed(db)).toEqual([null, null]);
  });
});
