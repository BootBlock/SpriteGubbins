import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import { DEFAULT_PROJECT_ID, createDefaultProject } from '../constants/projects.ts';
import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';
import { DEFAULT_SETTINGS } from '../constants/settings.ts';
import { LocalStorageBackend } from './localStorageBackend.ts';
import { STORAGE_KEYS } from './schema.ts';
import { createMemoryStorage, type WebStorageLike } from './webStorage.ts';

/**
 * The fallback's discard, driven through the backend that runs it as it is made.
 *
 * The case it exists for: a projects collection this build cannot read. The backend's reader
 * answered it with an empty list, `fetchProjects` wrote a lone Default over the key, and every
 * preset stayed filed under a project that no longer existed.
 */

const HARBOUR = 'harbour';

let storage: WebStorageLike;

/** Harbour, one preset and one set of dials in it, and the settings beside them. */
async function seed(): Promise<void> {
  const backend = new LocalStorageBackend(storage);
  await backend.saveProject({ id: HARBOUR, name: 'Harbour', description: '', createdAt: 1, updatedAt: 2 });
  await backend.savePreset({
    ...DEFAULT_PRESET,
    id: 'gull',
    projectId: HARBOUR,
    name: 'Gull',
    isCustom: true,
  });
  await backend.saveQuantisePreset({
    id: 'crisp',
    projectId: HARBOUR,
    name: 'Crisp',
    description: '',
    dials: QUANTISE_DEFAULT_DIALS,
  });
  await backend.saveSettings({ ...DEFAULT_SETTINGS, ambientBackdrop: false });
}

/** What a backend made over the store now reads back. */
async function library(): Promise<{ projects: string[]; presets: string[]; dials: string[] }> {
  const backend = new LocalStorageBackend(storage);
  return {
    projects: (await backend.listProjects()).map((entry) => entry.id),
    presets: (await backend.listPresets()).map((entry) => entry.id),
    dials: (await backend.listQuantisePresets()).map((entry) => entry.id),
  };
}

const EMPTY = { projects: [], presets: [], dials: [] };

beforeEach(async () => {
  storage = createMemoryStorage();
  await seed();
});

describe('discardIncompatibleLibrary', () => {
  it('keeps a library whose projects all read', async () => {
    expect(await library()).toEqual({ projects: [HARBOUR], presets: ['gull'], dials: ['crisp'] });
  });

  it.each([
    [
      'a project row in a shape this build does not read',
      JSON.stringify([{ id: HARBOUR, title: 'Harbour' }]),
    ],
    ['one unreadable row beside a readable one', JSON.stringify([{ id: 'broken' }, createDefaultProject(1)])],
    ['a value that is not JSON', '{not json'],
    ['JSON that is not a list', JSON.stringify({ id: HARBOUR })],
  ])('discards every preset with %s', async (_, projects) => {
    storage.setItem(STORAGE_KEYS.projects, projects);

    expect(await library()).toEqual(EMPTY);
  });

  it('discards every preset when the projects key is gone and the presets are not', async () => {
    const bare = createMemoryStorage();
    for (const key of [STORAGE_KEYS.customPresets, STORAGE_KEYS.quantisePresets]) {
      bare.setItem(key, storage.getItem(key) ?? '');
    }
    storage = bare;

    expect(await library()).toEqual(EMPTY);
  });

  it('leaves the collections that name no project alone', async () => {
    storage.setItem(STORAGE_KEYS.projects, '{not json');

    expect((await new LocalStorageBackend(storage).loadSettings()).ambientBackdrop).toBe(false);
  });

  it('writes nothing where storage refuses the read', async () => {
    const written: string[] = [];
    const unreadable: WebStorageLike = {
      getItem: () => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
      setItem: (key) => {
        written.push(key);
      },
    };

    new LocalStorageBackend(unreadable);

    expect(written).toEqual([]);
  });

  it('files a Default project the next boot writes with nothing beneath it', async () => {
    storage.setItem(STORAGE_KEYS.projects, '{not json');
    const backend = new LocalStorageBackend(storage);
    await backend.saveProject(createDefaultProject(3));

    expect((await backend.listProjects()).map((entry) => entry.id)).toEqual([DEFAULT_PROJECT_ID]);
    expect(await backend.listPresets()).toEqual([]);
  });
});
