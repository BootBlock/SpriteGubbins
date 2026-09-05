import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PRESET, PRESETS } from '../constants/presets/index.ts';
import { DEFAULT_PROJECT_ID, createDefaultProject } from '../constants/projects.ts';
import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';
import type { PersistenceBackend } from '../db/backend.ts';
import { LocalStorageBackend } from '../db/localStorageBackend.ts';
import { createMemoryStorage } from '../db/webStorage.ts';
import { createFailingBackend } from '../test/backendDoubles.ts';
import type { CustomArchetype } from '../types/preset.ts';
import type { Project } from '../types/project.ts';
import type { QuantisePreset } from '../types/quantisePreset.ts';
import { useLibraryTransferStore } from './useLibraryTransferStore.ts';
import { usePresetStore } from './usePresetStore.ts';
import { useProjectStore } from './useProjectStore.ts';
import { useQuantisePresetStore } from './useQuantisePresetStore.ts';
import { useUIStore } from './useUIStore.ts';

/**
 * The transfer that replaces everything the reader has saved, and the question that stands in front
 * of it.
 *
 * Backed by a real `LocalStorageBackend` over an in-memory store, as the three collection stores
 * are, so what these tests assert about storage is what the app actually does. The pack *format* is
 * `utils/libraryPack.test.ts`'s subject; what is here is the flow — staging, confirming, cancelling
 * and reporting.
 */
let backend: PersistenceBackend = new LocalStorageBackend(createMemoryStorage());

vi.mock('../db/database.ts', () => ({
  getDatabase: () => Promise.resolve(backend),
}));

const HARBOUR: Project = {
  id: 'harbour',
  name: 'Harbour',
  description: 'The town scenes.',
  createdAt: 1,
  updatedAt: 2,
};

function preset(projectId: string, id: string, name: string): CustomArchetype {
  return { ...DEFAULT_PRESET, id, projectId, name, isCustom: true };
}

function dials(projectId: string, id: string, name: string): QuantisePreset {
  return { id, projectId, name, description: '', dials: QUANTISE_DEFAULT_DIALS };
}

/** A pack file, in the shape the app itself writes. */
function packFile(pack: {
  readonly projects?: readonly unknown[];
  readonly presets?: readonly unknown[];
  readonly quantisePresets?: readonly unknown[];
}): File {
  return new File([JSON.stringify(pack)], 'sprite-gubbins-library.json', { type: 'application/json' });
}

/** One project, one archetype and one set of dials, which is the smallest whole library. */
function smallPack() {
  return {
    projects: [HARBOUR],
    presets: [preset(HARBOUR.id, 'custom-imported-1', 'Imported Knight')],
    quantisePresets: [dials(HARBOUR.id, 'quantise-imported-1', 'Imported Dials')],
  };
}

/** What the reader had before an import: the Default project holding one preset. */
async function seedLibrary(): Promise<void> {
  await backend.saveProject(createDefaultProject(1_000));
  await backend.savePreset(preset(DEFAULT_PROJECT_ID, 'custom-mine', 'Mine'));
  await useProjectStore.getState().fetchProjects();
  await usePresetStore.getState().fetchCustomPresets();
  await useQuantisePresetStore.getState().fetchQuantisePresets();
}

beforeEach(() => {
  backend = new LocalStorageBackend(createMemoryStorage());
  useLibraryTransferStore.setState({ isTransferring: false, pendingImport: null });
  useProjectStore.setState({ projects: [] });
  usePresetStore.setState({ customPresets: [] });
  useQuantisePresetStore.setState({ presets: [] });
  useUIStore.getState().dismissToast();
});

afterEach(() => {
  useUIStore.getState().dismissToast();
});

describe('exportLibraryJSON', () => {
  it('carries the projects, both collections and the built-in archetypes', async () => {
    await seedLibrary();
    await backend.saveQuantisePreset(dials(DEFAULT_PROJECT_ID, 'quantise-mine', 'My Dials'));
    await useQuantisePresetStore.getState().fetchQuantisePresets();

    const parsed: unknown = JSON.parse(useLibraryTransferStore.getState().exportLibraryJSON());
    if (typeof parsed !== 'object' || parsed === null) throw new Error('the export should be an object.');
    const pack = parsed as Record<string, unknown[]>;

    expect(pack['projects']).toHaveLength(1);
    // The built-ins travel too, which is what makes the file readable on its own — and is why the
    // parser has to skip them coming back.
    expect(pack['presets']).toHaveLength(PRESETS.length + 1);
    expect(pack['quantisePresets']).toHaveLength(1);
  });
});

describe('importLibraryJSON', () => {
  it('stages the pack and deletes nothing until the reader agrees', async () => {
    // The defect this two-step flow exists for: one press of Import, one file picked, and every
    // preset the reader had saved was gone. The only warning was the button's tooltip, which
    // `ControlTooltip` cannot show on a touchscreen at all.
    await seedLibrary();

    await useLibraryTransferStore.getState().importLibraryJSON(packFile(smallPack()));

    expect(useLibraryTransferStore.getState().pendingImport?.projects).toHaveLength(1);
    // Neither the stores nor storage has moved — the question is all that has happened.
    expect(usePresetStore.getState().customPresets.map((entry) => entry.name)).toEqual(['Mine']);
    await expect(backend.listProjects()).resolves.toHaveLength(1);
    expect((await backend.listPresets())[0]?.name).toBe('Mine');
  });

  it('replaces all three collections once the replacement is confirmed', async () => {
    await seedLibrary();
    await useLibraryTransferStore.getState().importLibraryJSON(packFile(smallPack()));

    await useLibraryTransferStore.getState().confirmLibraryImport();

    expect(useProjectStore.getState().projects.map((project) => project.name)).toEqual(['Harbour']);
    expect(usePresetStore.getState().customPresets.map((entry) => entry.name)).toEqual(['Imported Knight']);
    expect(useQuantisePresetStore.getState().presets.map((entry) => entry.name)).toEqual(['Imported Dials']);
    expect(useLibraryTransferStore.getState().isTransferring).toBe(false);
    expect(useLibraryTransferStore.getState().pendingImport).toBeNull();
  });

  it('leaves everything stored exactly as it was when the replacement is declined', async () => {
    await seedLibrary();
    const before = await backend.listPresets();
    await useLibraryTransferStore.getState().importLibraryJSON(packFile(smallPack()));

    useLibraryTransferStore.getState().cancelLibraryImport();

    expect(useLibraryTransferStore.getState().pendingImport).toBeNull();
    await expect(backend.listPresets()).resolves.toEqual(before);
    expect(useUIStore.getState().toastMessage).toBe('Import cancelled, and nothing of yours was deleted');
  });

  it('replaces nothing when nothing is staged', async () => {
    await seedLibrary();

    await useLibraryTransferStore.getState().confirmLibraryImport();

    expect(usePresetStore.getState().customPresets.map((entry) => entry.name)).toEqual(['Mine']);
  });

  it('closes the question before the write, so a second press cannot replace twice', async () => {
    await seedLibrary();
    await useLibraryTransferStore.getState().importLibraryJSON(packFile(smallPack()));

    const writing = useLibraryTransferStore.getState().confirmLibraryImport();
    // Already closed, with the write still in flight — which is what makes the second press a no-op.
    expect(useLibraryTransferStore.getState().pendingImport).toBeNull();
    await useLibraryTransferStore.getState().confirmLibraryImport();
    await writing;

    expect(usePresetStore.getState().customPresets.map((entry) => entry.name)).toEqual(['Imported Knight']);
    // One replace, so one truthful sentence — a second would have reported replacing a library the
    // first had already replaced.
    expect(useUIStore.getState().toastMessage).toBe('Imported 3 saved items, replacing 2');
  });

  it('says nothing when there is no question left to cancel', async () => {
    // Cancel used to answer “nothing of yours was deleted” over a deletion already dispatched.
    await seedLibrary();
    await useLibraryTransferStore.getState().importLibraryJSON(packFile(smallPack()));
    const writing = useLibraryTransferStore.getState().confirmLibraryImport();
    useUIStore.getState().dismissToast();

    useLibraryTransferStore.getState().cancelLibraryImport();

    expect(useUIStore.getState().toastMessage).toBeNull();
    await writing;
  });

  it('reports the arrival alone when there was nothing of the reader’s to replace', async () => {
    await useLibraryTransferStore.getState().importLibraryJSON(packFile(smallPack()));

    await useLibraryTransferStore.getState().confirmLibraryImport();

    expect(useUIStore.getState().toastMessage).toBe('Imported 3 saved items');
  });

  it('skips built-ins, so re-importing an export does not duplicate them', async () => {
    await seedLibrary();
    const exported: unknown = JSON.parse(useLibraryTransferStore.getState().exportLibraryJSON());
    if (typeof exported !== 'object' || exported === null) throw new Error('the export should be an object.');

    await useLibraryTransferStore
      .getState()
      .importLibraryJSON(new File([JSON.stringify(exported)], 'library.json'));
    await useLibraryTransferStore.getState().confirmLibraryImport();

    expect(usePresetStore.getState().customPresets.map((entry) => entry.name)).toEqual(['Mine']);
  });

  it('refuses a pack holding nothing rather than deleting everything', async () => {
    await seedLibrary();

    await useLibraryTransferStore.getState().importLibraryJSON(packFile({ projects: [] }));

    expect(useLibraryTransferStore.getState().pendingImport).toBeNull();
    expect(usePresetStore.getState().customPresets.map((entry) => entry.name)).toEqual(['Mine']);
    expect(useUIStore.getState().toastMessage).toBe('No projects or saved presets found in that file');
  });

  it('rejects a file that is not a pack at all, and clears the busy flag', async () => {
    const notJson = new File(['<html>not a pack</html>'], 'page.html', { type: 'text/html' });

    await useLibraryTransferStore.getState().importLibraryJSON(notJson);

    expect(useUIStore.getState().toastMessage).toBe('That file is not a Sprite Gubbins library pack');
    expect(useLibraryTransferStore.getState().isTransferring).toBe(false);
  });

  it('reports a replacement it could not write, and leaves the question closed', async () => {
    await seedLibrary();
    await useLibraryTransferStore.getState().importLibraryJSON(packFile(smallPack()));
    backend = createFailingBackend();

    await useLibraryTransferStore.getState().confirmLibraryImport();

    expect(useUIStore.getState().toastMessage).toBe('Could not import that library pack');
    // The flag has to come back down, or both transfer controls stay disabled for the session.
    expect(useLibraryTransferStore.getState().isTransferring).toBe(false);
    // And the question goes with it — a failed replace is retried from the button, not by being
    // asked again over a library nothing happened to.
    expect(useLibraryTransferStore.getState().pendingImport).toBeNull();
  });
});
