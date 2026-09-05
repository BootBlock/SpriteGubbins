import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import { DEFAULT_PROJECT_ID, DEFAULT_PROJECT_NAME, createDefaultProject } from '../constants/projects.ts';
import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';
import type { PersistenceBackend } from '../db/backend.ts';
import { LocalStorageBackend } from '../db/localStorageBackend.ts';
import { createMemoryStorage } from '../db/webStorage.ts';
import { createFailingBackend } from '../test/backendDoubles.ts';
import type { CustomArchetype } from '../types/preset.ts';
import type { QuantisePreset } from '../types/quantisePreset.ts';
import { usePresetStore } from './usePresetStore.ts';
import { useProjectStore } from './useProjectStore.ts';
import { useQuantisePresetStore } from './useQuantisePresetStore.ts';
import { useUIStore } from './useUIStore.ts';

/**
 * Backed by a real `LocalStorageBackend` over an in-memory store rather than a hand-written fake,
 * so what these tests assert about persistence is what the app actually does — the arrangement
 * `usePresetStore.test.ts` uses, and for the same reason. Only the module that *chooses* a backend
 * is mocked: that choice needs a browser this environment does not have.
 */
let backend: PersistenceBackend = new LocalStorageBackend(createMemoryStorage());

vi.mock('../db/database.ts', () => ({
  getDatabase: () => Promise.resolve(backend),
}));

function preset(projectId: string, id: string): CustomArchetype {
  return { ...DEFAULT_PRESET, id, projectId, name: id, isCustom: true };
}

function dials(projectId: string, id: string): QuantisePreset {
  return { id, projectId, name: id, description: '', dials: QUANTISE_DEFAULT_DIALS };
}

/** The project the store makes on a boot that finds none, as it would already be stored. */
async function seedDefault(): Promise<void> {
  await backend.saveProject(createDefaultProject(1_000));
  await useProjectStore.getState().fetchProjects();
}

beforeEach(() => {
  backend = new LocalStorageBackend(createMemoryStorage());
  useProjectStore.setState({ projects: [] });
  usePresetStore.setState({ customPresets: [] });
  useQuantisePresetStore.setState({ presets: [] });
  useUIStore.getState().dismissToast();
});

afterEach(() => {
  // The store schedules a real auto-dismiss for every toast; cancel it so nothing is left pending
  // once the suite finishes.
  useUIStore.getState().dismissToast();
});

describe('fetchProjects', () => {
  it('makes the Default project on an install that has none', async () => {
    await useProjectStore.getState().fetchProjects();

    const { projects } = useProjectStore.getState();
    expect(projects.map((project) => project.id)).toEqual([DEFAULT_PROJECT_ID]);
    expect(projects[0]?.name).toBe(DEFAULT_PROJECT_NAME);
    // Written, not merely held: the preset a reader saves a moment later names a project that has
    // to actually be in storage.
    await expect(backend.listProjects()).resolves.toHaveLength(1);
  });

  it('loads what a previous session stored, and makes nothing', async () => {
    await backend.saveProject({
      id: 'harbour',
      name: 'Harbour',
      description: 'The town scenes.',
      createdAt: 1,
      updatedAt: 2,
    });

    await useProjectStore.getState().fetchProjects();

    expect(useProjectStore.getState().projects.map((project) => project.name)).toEqual(['Harbour']);
  });

  it('reports a failed read', async () => {
    backend = createFailingBackend();
    await useProjectStore.getState().fetchProjects();

    expect(useProjectStore.getState().projects).toHaveLength(0);
    expect(useUIStore.getState().toastMessage).toBe('Could not load your projects');
  });
});

describe('createProject', () => {
  it('stores a project under the trimmed name and describes it', async () => {
    await expect(useProjectStore.getState().createProject('  Harbour  ', '  Town scenes  ')).resolves.toBe(
      true,
    );

    const [stored] = await backend.listProjects();
    expect(stored?.name).toBe('Harbour');
    expect(stored?.description).toBe('Town scenes');
    expect(useUIStore.getState().toastMessage).toBe('Created project “Harbour”');
  });

  it('mints an id that is not the Default project’s', async () => {
    await useProjectStore.getState().createProject('Harbour', '');

    const [stored] = await backend.listProjects();
    expect(stored?.id).not.toBe(DEFAULT_PROJECT_ID);
    expect(stored?.id).not.toBe('');
  });

  it('refuses a blank name without touching storage', async () => {
    await expect(useProjectStore.getState().createProject('   ', '')).resolves.toBe(false);
    await expect(backend.listProjects()).resolves.toHaveLength(0);
  });

  it('refuses a name another project already answers to, whatever its case', async () => {
    // Refused rather than merged, and this is where a project differs from a preset: a preset saved
    // under a name the library holds *updates* it, while a project is chosen from a dropdown and
    // two rows nobody can tell apart is a choice nobody can make.
    await useProjectStore.getState().createProject('Harbour', '');
    useUIStore.getState().dismissToast();

    await expect(useProjectStore.getState().createProject('  harbour ', '')).resolves.toBe(false);

    await expect(backend.listProjects()).resolves.toHaveLength(1);
    expect(useUIStore.getState().toastMessage).toBe('A project named “Harbour” already exists');
  });

  it('reports a failed write instead of showing a project that was never stored', async () => {
    backend = createFailingBackend();

    await expect(useProjectStore.getState().createProject('Harbour', '')).resolves.toBe(false);

    expect(useProjectStore.getState().projects).toHaveLength(0);
    expect(useUIStore.getState().toastMessage).toBe('Could not create that project');
  });
});

describe('updateProjectDetails', () => {
  it('renames without changing the id every preset refers to', async () => {
    await seedDefault();
    await backend.savePreset(preset(DEFAULT_PROJECT_ID, 'custom-1'));
    await usePresetStore.getState().fetchCustomPresets();

    await expect(
      useProjectStore.getState().updateProjectDetails(DEFAULT_PROJECT_ID, 'My Game', 'Everything.'),
    ).resolves.toBe(true);

    const [stored] = await backend.listProjects();
    expect(stored?.id).toBe(DEFAULT_PROJECT_ID);
    expect(stored?.name).toBe('My Game');
    expect(stored?.description).toBe('Everything.');
    // The whole point of addressing a project by id: the preset filed under it is untouched.
    expect((await backend.listPresets())[0]?.projectId).toBe(DEFAULT_PROJECT_ID);
    expect(useUIStore.getState().toastMessage).toBe('Updated “My Game”');
  });

  it('renames the Default project, which is the one thing it may have done to it', async () => {
    await seedDefault();

    await expect(
      useProjectStore.getState().updateProjectDetails(DEFAULT_PROJECT_ID, 'My Game', ''),
    ).resolves.toBe(true);
    expect(useProjectStore.getState().projects[0]?.name).toBe('My Game');
  });

  it('keeps the creation date, because a rename is not a new project', async () => {
    await seedDefault();
    const before = useProjectStore.getState().projects[0]?.createdAt;

    await useProjectStore.getState().updateProjectDetails(DEFAULT_PROJECT_ID, 'My Game', '');

    expect((await backend.listProjects())[0]?.createdAt).toBe(before);
  });

  it('refuses a name another project holds, and changes nothing', async () => {
    await useProjectStore.getState().createProject('Harbour', '');
    await useProjectStore.getState().createProject('Foundry', '');
    const foundry = useProjectStore.getState().projects.find((project) => project.name === 'Foundry');
    if (!foundry) throw new Error('the project should have been created.');

    await expect(useProjectStore.getState().updateProjectDetails(foundry.id, 'Harbour', '')).resolves.toBe(
      false,
    );

    expect(
      useProjectStore
        .getState()
        .projects.map((project) => project.name)
        .sort(),
    ).toEqual(['Foundry', 'Harbour']);
  });

  it('lets a project be recapitalised, because it is not a collision with itself', async () => {
    await useProjectStore.getState().createProject('harbour', '');
    const [project] = useProjectStore.getState().projects;
    if (!project) throw new Error('the project should have been created.');

    await expect(useProjectStore.getState().updateProjectDetails(project.id, 'Harbour', '')).resolves.toBe(
      true,
    );
    expect(useProjectStore.getState().projects[0]?.name).toBe('Harbour');
  });

  it('refuses a blank name, and an id nothing holds', async () => {
    await seedDefault();

    await expect(useProjectStore.getState().updateProjectDetails(DEFAULT_PROJECT_ID, '  ', '')).resolves.toBe(
      false,
    );
    await expect(useProjectStore.getState().updateProjectDetails('never-existed', 'X', '')).resolves.toBe(
      false,
    );
    expect(useProjectStore.getState().projects[0]?.name).toBe(DEFAULT_PROJECT_NAME);
  });
});

describe('deleteProject', () => {
  it('takes everything filed under it, and leaves every other project’s alone', async () => {
    await seedDefault();
    await useProjectStore.getState().createProject('Harbour', '');
    const harbour = useProjectStore.getState().projects.find((project) => project.name === 'Harbour');
    if (!harbour) throw new Error('the project should have been created.');

    await backend.savePreset(preset(harbour.id, 'doomed'));
    await backend.savePreset(preset(DEFAULT_PROJECT_ID, 'kept'));
    await backend.saveQuantisePreset(dials(harbour.id, 'doomed-dials'));
    await backend.saveQuantisePreset(dials(DEFAULT_PROJECT_ID, 'kept-dials'));
    await usePresetStore.getState().fetchCustomPresets();
    await useQuantisePresetStore.getState().fetchQuantisePresets();

    await useProjectStore.getState().deleteProject(harbour.id);

    expect(useProjectStore.getState().projects.map((project) => project.id)).toEqual([DEFAULT_PROJECT_ID]);
    // Both collections re-read rather than filtered in place, so what is on screen is what storage
    // now holds.
    expect(usePresetStore.getState().customPresets.map((entry) => entry.id)).toEqual(['kept']);
    expect(useQuantisePresetStore.getState().presets.map((entry) => entry.id)).toEqual(['kept-dials']);
    await expect(backend.listPresets()).resolves.toHaveLength(1);
    await expect(backend.listQuantisePresets()).resolves.toHaveLength(1);
    expect(useUIStore.getState().toastMessage).toBe('Deleted project, and everything saved in it');
  });

  it('refuses the Default project, which is where a save goes when nothing else is chosen', async () => {
    await seedDefault();
    await backend.savePreset(preset(DEFAULT_PROJECT_ID, 'kept'));
    await usePresetStore.getState().fetchCustomPresets();

    await useProjectStore.getState().deleteProject(DEFAULT_PROJECT_ID);

    expect(useProjectStore.getState().projects).toHaveLength(1);
    await expect(backend.listPresets()).resolves.toHaveLength(1);
    expect(useUIStore.getState().toastMessage).toBe('The Default project cannot be deleted');
  });

  it('reports a failed delete, and keeps showing the project', async () => {
    await useProjectStore.getState().createProject('Harbour', '');
    const [harbour] = useProjectStore.getState().projects;
    if (!harbour) throw new Error('the project should have been created.');
    backend = createFailingBackend();

    await useProjectStore.getState().deleteProject(harbour.id);

    expect(useProjectStore.getState().projects).toHaveLength(1);
    expect(useUIStore.getState().toastMessage).toBe('Could not delete that project');
  });
});
