import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import { DEFAULT_PROJECT_ID, createDefaultProject } from '../constants/projects.ts';
import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';
import type { CustomArchetype } from '../types/preset.ts';
import type { QuantisePreset } from '../types/quantisePreset.ts';
import { LocalStorageBackend } from './localStorageBackend.ts';
import { STORAGE_KEYS } from './schema.ts';
import { createMemoryStorage, type WebStorageLike } from './webStorage.ts';

/**
 * The two operations that leave three stored collections consistent with one another **without a
 * transaction**, driven through the backend that owns them.
 *
 * What is under test is each operation's promise for the case it cannot avoid: a write refused
 * partway. The happy paths are covered by `localStorageBackend.test.ts` alongside the rest of that
 * class; here every test refuses a *particular* key, which is the one shape neither shared storage
 * double can produce — `createRefusingStorage` refuses the first write and `createBoundedStorage`
 * refuses by size.
 */

/**
 * `inner`, except that a write to `refused` throws.
 *
 * It wraps a store that is already holding a library rather than making its own, because the
 * seeding has to go *through* the key this then refuses — a fresh store behind the refusal could
 * never be given anything to lose.
 */
function refusingWrite(inner: WebStorageLike, refused: string): WebStorageLike {
  return {
    getItem: (key) => inner.getItem(key),
    setItem: (key, value) => {
      if (key === refused) {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      }
      inner.setItem(key, value);
    },
  };
}

const HARBOUR = 'harbour';

function preset(projectId: string, id: string): CustomArchetype {
  return { ...DEFAULT_PRESET, id, projectId, name: id, isCustom: true };
}

function dials(projectId: string, id: string): QuantisePreset {
  return { id, projectId, name: id, description: '', dials: QUANTISE_DEFAULT_DIALS };
}

/** The Default project and Harbour, one preset and one set of dials in each. */
async function seed(backend: LocalStorageBackend): Promise<void> {
  await backend.saveProject(createDefaultProject(1_000));
  await backend.saveProject({
    id: HARBOUR,
    name: 'Harbour',
    description: '',
    createdAt: 1,
    updatedAt: 2,
  });
  await backend.savePreset(preset(HARBOUR, 'doomed'));
  await backend.savePreset(preset(DEFAULT_PROJECT_ID, 'kept'));
  await backend.saveQuantisePreset(dials(HARBOUR, 'doomed-dials'));
  await backend.saveQuantisePreset(dials(DEFAULT_PROJECT_ID, 'kept-dials'));
}

let storage: WebStorageLike;
let backend: LocalStorageBackend;

beforeEach(() => {
  storage = createMemoryStorage();
  backend = new LocalStorageBackend(storage);
});

describe('deleteProject on the fallback', () => {
  it('takes the project’s own presets and dials, and no others', async () => {
    await seed(backend);

    await backend.deleteProject(HARBOUR);

    expect((await backend.listProjects()).map((project) => project.id)).toEqual([DEFAULT_PROJECT_ID]);
    expect((await backend.listPresets()).map((entry) => entry.id)).toEqual(['kept']);
    expect((await backend.listQuantisePresets()).map((entry) => entry.id)).toEqual(['kept-dials']);
  });

  it('leaves no preset naming a project that is gone when a write is refused', async () => {
    // The whole of what this backend can promise without a transaction: the two collections are
    // cleaned *before* the project row, so a refusal partway leaves presets whose project still
    // exists rather than presets pointing at nothing.
    //
    // **The archetypes are the key to refuse, and the projects would not discriminate.** Refusing
    // the projects means refusing the *last* write under the order that is correct and the *first*
    // under the order that is not, and both of those end with nothing changed — so the test would
    // pass either way. Refusing the archetypes is the write in the middle: under the wrong order
    // the project row has already gone by the time it fails, and every preset in it is orphaned.
    await seed(backend);
    const refusing = new LocalStorageBackend(refusingWrite(storage, STORAGE_KEYS.customPresets));

    await expect(refusing.deleteProject(HARBOUR)).rejects.toThrow(/refused the write/i);

    const projects = (await refusing.listProjects()).map((project) => project.id);
    const presets = await refusing.listPresets();
    const saved = await refusing.listQuantisePresets();
    expect(projects).toContain(HARBOUR);
    expect(presets.every((entry) => projects.includes(entry.projectId))).toBe(true);
    expect(saved.every((entry) => projects.includes(entry.projectId))).toBe(true);
  });
});

describe('replaceLibrary on the fallback', () => {
  it('writes all three collections in the file’s own order', async () => {
    await seed(backend);

    await backend.replaceLibrary({
      projects: [createDefaultProject(2_000)],
      presets: [preset(DEFAULT_PROJECT_ID, 'imported')],
      quantisePresets: [dials(DEFAULT_PROJECT_ID, 'imported-dials')],
    });

    expect((await backend.listProjects()).map((project) => project.id)).toEqual([DEFAULT_PROJECT_ID]);
    expect((await backend.listPresets()).map((entry) => entry.id)).toEqual(['imported']);
    expect((await backend.listQuantisePresets()).map((entry) => entry.id)).toEqual(['imported-dials']);
  });

  it('stores the projects most-recently-edited first, as the other backend lists them', async () => {
    // The two preset collections keep the file's order; the projects cannot, because they carry
    // their own timestamps and the SQLite side lists them `ORDER BY updated_at DESC`. A pack in any
    // other order would come back one way there and another here.
    await backend.replaceLibrary({
      projects: [
        { id: 'oldest', name: 'Oldest', description: '', createdAt: 1, updatedAt: 1 },
        { id: 'newest', name: 'Newest', description: '', createdAt: 2, updatedAt: 9 },
        { id: 'middle', name: 'Middle', description: '', createdAt: 3, updatedAt: 5 },
      ],
      presets: [],
      quantisePresets: [],
    });

    expect((await backend.listProjects()).map((project) => project.id)).toEqual([
      'newest',
      'middle',
      'oldest',
    ]);
  });

  it('puts back what it had when a write partway through is refused', async () => {
    // The keys are written projects-first, so refusing the archetypes is a refusal *after* the
    // projects have already been replaced — the state that would otherwise leave every preset the
    // reader kept naming a project the import had removed.
    await seed(backend);
    const refusing = new LocalStorageBackend(refusingWrite(storage, STORAGE_KEYS.customPresets));

    await expect(
      refusing.replaceLibrary({
        projects: [{ id: 'other', name: 'Other', description: '', createdAt: 3, updatedAt: 3 }],
        presets: [],
        quantisePresets: [],
      }),
    ).rejects.toThrow(/refused the write/i);

    // The library the reader had, back as it was — not the half-replaced one the failure produced.
    expect((await refusing.listProjects()).map((project) => project.id).sort()).toEqual(
      [DEFAULT_PROJECT_ID, HARBOUR].sort(),
    );
    expect((await refusing.listPresets()).map((entry) => entry.id).sort()).toEqual(['doomed', 'kept']);
    expect((await refusing.listQuantisePresets()).map((entry) => entry.id).sort()).toEqual([
      'doomed-dials',
      'kept-dials',
    ]);
  });
});
