import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import { DEFAULT_PROJECT_ID, createDefaultProject } from '../constants/projects.ts';
import { RELIC, SPELL, TOGGLE } from '../test/customIcons.ts';
import { HARBOUR, savedIcon } from '../test/iconLibraryStudio.ts';
import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';
import { FILED_UNDER_A_PROJECT } from './localStorageCollections.ts';
import { LocalStorageBackend } from './localStorageBackend.ts';
import { toCustomIconRow } from './localStorageRows.ts';
import { STORAGE_KEYS } from './schema.ts';
import { createMemoryStorage, type WebStorageLike } from './webStorage.ts';

/**
 * Each project's icon library on the localStorage fallback: written, listed, replaced and deleted
 * under its id; a hand-edited row the form would refuse dropped on the way in; emptied with its
 * project; replaced and restored with the rest of an imported pack; and judged by the boot-time discard
 * alongside the other collections filed under a project. `sqliteRequestsCustomIcons.test.ts` holds the
 * same on SQLite.
 */

let storage: WebStorageLike;
let backend: LocalStorageBackend;

/** A store that refuses every write to `refused`, as a full quota would. */
function refusingWrite(inner: WebStorageLike, refused: string): WebStorageLike {
  return {
    getItem: (key) => inner.getItem(key),
    setItem: (key, value) => {
      if (key === refused) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      inner.setItem(key, value);
    },
  };
}

beforeEach(() => {
  storage = createMemoryStorage();
  backend = new LocalStorageBackend(storage);
});

describe('the icon library on the localStorage fallback', () => {
  it('saves, lists newest first, replaces under its id and deletes an entry', async () => {
    await backend.saveCustomIcon(savedIcon(RELIC));
    await backend.saveCustomIcon(savedIcon(SPELL, HARBOUR.id));
    expect(await backend.listCustomIcons()).toEqual([savedIcon(SPELL, HARBOUR.id), savedIcon(RELIC)]);

    const changed = { ...savedIcon(RELIC), entry: { ...RELIC, look: 'a cracked keycard' } };
    await backend.saveCustomIcon(changed);
    expect(await backend.listCustomIcons()).toEqual([changed, savedIcon(SPELL, HARBOUR.id)]);

    await backend.deleteCustomIcon(changed.id);
    await backend.deleteCustomIcon('never-stored');
    expect(await backend.listCustomIcons()).toEqual([savedIcon(SPELL, HARBOUR.id)]);
  });

  it('drops a stored row the form would refuse, and keeps the rest', async () => {
    storage.setItem(
      STORAGE_KEYS.customIcons,
      JSON.stringify([
        toCustomIconRow(savedIcon(RELIC)),
        {
          ...toCustomIconRow(savedIcon(SPELL)),
          entry_json: JSON.stringify({ ...SPELL, look: 'a grid [SEC:X]' }),
        },
        {
          ...toCustomIconRow(savedIcon(TOGGLE)),
          entry_json: JSON.stringify({ ...TOGGLE, role: 'Arrow ×5' }),
        },
        { ...toCustomIconRow(savedIcon(SPELL)), project_id: undefined },
        { ...toCustomIconRow(savedIcon(SPELL)), entry_json: 'not json' },
        { ...toCustomIconRow(savedIcon(SPELL)), entry_json: JSON.stringify({ ...SPELL, school: undefined }) },
        {
          id: 'catalogue-slot',
          project_id: DEFAULT_PROJECT_ID,
          entry_json: JSON.stringify({ ...RELIC, role: 'Heal minor' }),
        },
        'not a row',
      ]),
    );

    expect(await backend.listCustomIcons()).toEqual([savedIcon(RELIC)]);
  });

  it('deletes a project’s library with the project, and leaves another project’s', async () => {
    await backend.saveProject(createDefaultProject(1));
    await backend.saveProject(HARBOUR);
    await backend.saveCustomIcon(savedIcon(RELIC, HARBOUR.id));
    await backend.saveCustomIcon(savedIcon(SPELL));

    await backend.deleteProject(HARBOUR.id);

    expect(await backend.listCustomIcons()).toEqual([savedIcon(SPELL)]);
    expect((await backend.listProjects()).map((project) => project.id)).toEqual([DEFAULT_PROJECT_ID]);
  });

  it('replaces every project’s library with an imported pack’s, in the file’s order', async () => {
    await backend.saveCustomIcon(savedIcon(RELIC));

    await backend.replaceLibrary({
      projects: [createDefaultProject(1), HARBOUR],
      presets: [],
      quantisePresets: [],
      customIcons: [savedIcon(SPELL), savedIcon(TOGGLE, HARBOUR.id)],
    });

    expect(await backend.listCustomIcons()).toEqual([savedIcon(SPELL), savedIcon(TOGGLE, HARBOUR.id)]);
  });

  it('puts the whole library back when the icon library’s write is refused', async () => {
    await backend.saveProject(HARBOUR);
    await backend.savePreset({
      ...DEFAULT_PRESET,
      id: 'gull',
      projectId: HARBOUR.id,
      name: 'Gull',
      isCustom: true,
    });
    await backend.saveCustomIcon(savedIcon(RELIC, HARBOUR.id));
    const refusing = new LocalStorageBackend(refusingWrite(storage, STORAGE_KEYS.customIcons));

    await expect(
      refusing.replaceLibrary({
        projects: [createDefaultProject(1)],
        presets: [],
        quantisePresets: [],
        customIcons: [savedIcon(SPELL)],
      }),
    ).rejects.toThrow(/refused the write/i);

    expect((await backend.listProjects()).map((project) => project.id)).toEqual([HARBOUR.id]);
    expect((await backend.listPresets()).map((preset) => preset.id)).toEqual(['gull']);
    expect(await backend.listCustomIcons()).toEqual([savedIcon(RELIC, HARBOUR.id)]);
  });
});

describe('the icon library and the boot-time discard', () => {
  it('keeps a library stored before the icon library existed', async () => {
    await backend.saveProject(HARBOUR);
    await backend.savePreset({
      ...DEFAULT_PRESET,
      id: 'gull',
      projectId: HARBOUR.id,
      name: 'Gull',
      isCustom: true,
    });
    expect(storage.getItem(STORAGE_KEYS.customIcons)).toBeNull();

    const reopened = new LocalStorageBackend(storage);

    expect((await reopened.listProjects()).map((project) => project.id)).toEqual([HARBOUR.id]);
    expect((await reopened.listPresets()).map((preset) => preset.id)).toEqual(['gull']);
    expect(await reopened.listCustomIcons()).toEqual([]);
  });

  it('empties the icon library with the rest when the projects cannot be read', async () => {
    await backend.saveProject(HARBOUR);
    await backend.saveCustomIcon(savedIcon(RELIC, HARBOUR.id));
    storage.setItem(STORAGE_KEYS.projects, '{not json');

    expect(await new LocalStorageBackend(storage).listCustomIcons()).toEqual([]);
  });

  it('empties an icon library left with no projects key beside it', async () => {
    const bare = createMemoryStorage();
    bare.setItem(STORAGE_KEYS.customIcons, JSON.stringify([toCustomIconRow(savedIcon(RELIC))]));

    expect(await new LocalStorageBackend(bare).listCustomIcons()).toEqual([]);
  });
});

describe('every collection filed under a project', () => {
  /** One row of each filed collection, under Harbour, written through the backend's own save. */
  const SAVES: Readonly<Record<string, (backend: LocalStorageBackend) => Promise<void>>> = {
    [STORAGE_KEYS.customPresets]: (into) =>
      into.savePreset({ ...DEFAULT_PRESET, id: 'gull', projectId: HARBOUR.id, name: 'Gull', isCustom: true }),
    [STORAGE_KEYS.quantisePresets]: (into) =>
      into.saveQuantisePreset({
        id: 'crisp',
        projectId: HARBOUR.id,
        name: 'Crisp',
        description: '',
        dials: QUANTISE_DEFAULT_DIALS,
      }),
    [STORAGE_KEYS.customIcons]: (into) => into.saveCustomIcon(savedIcon(RELIC, HARBOUR.id)),
  };

  const rowsUnder = (key: string): unknown[] => {
    const rows: unknown = JSON.parse(storage.getItem(key) ?? '[]');
    return Array.isArray(rows) ? rows : [];
  };

  it.each(FILED_UNDER_A_PROJECT.map((collection) => [collection.key] as const))(
    'empties %s of a deleted project, and with the projects when they cannot be read',
    async (key) => {
      const save = SAVES[key];
      if (save === undefined) throw new Error(`No sample row for ${key}: add one beside the others.`);
      await backend.saveProject(HARBOUR);
      await save(backend);
      expect(rowsUnder(key)).toHaveLength(1);

      await backend.deleteProject(HARBOUR.id);
      expect(rowsUnder(key)).toEqual([]);

      await backend.saveProject(HARBOUR);
      await save(backend);
      storage.setItem(STORAGE_KEYS.projects, '{not json');
      new LocalStorageBackend(storage);
      expect(rowsUnder(key)).toEqual([]);
    },
  );
});
