import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PRESET, PRESETS } from '../constants/presets.ts';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import type { PersistenceBackend } from '../db/backend.ts';
import { LocalStorageBackend } from '../db/localStorageBackend.ts';
import { createMemoryStorage } from '../db/webStorage.ts';
import { createFailingBackend } from '../test/backendDoubles.ts';
import type { PresetArchetype } from '../types/preset.ts';
import { useOutputStore } from './useOutputStore.ts';
import { usePresetStore } from './usePresetStore.ts';
import { useSubjectStore } from './useSubjectStore.ts';
import { useUIStore } from './useUIStore.ts';

/**
 * Backed by a real `LocalStorageBackend` over an in-memory store rather than a hand-written fake,
 * so what these tests assert about persistence is what the app actually does. Only the module that
 * *chooses* a backend is mocked — the choice needs a browser this environment doesn't have.
 *
 * `backend` is read lazily inside the factory, which is what lets each test start from empty
 * storage (or swap in a failing backend) after the mock has been hoisted.
 */
let backend: PersistenceBackend = new LocalStorageBackend(createMemoryStorage());

vi.mock('../db/database.ts', () => ({
  getDatabase: () => Promise.resolve(backend),
}));

/** The pack the app itself exports, as a file the user would hand back to it. */
function packFile(presets: readonly unknown[]): File {
  return new File([JSON.stringify(presets)], 'sprite-gubbins-presets.json', {
    type: 'application/json',
  });
}

function customPreset(overrides: Partial<PresetArchetype> = {}): PresetArchetype {
  return {
    id: 'custom-imported-1',
    name: 'Imported Knight',
    category: 'CHARACTER',
    subject: defaultSubjectFor('CHARACTER'),
    output: DEFAULT_PRESET.output,
    isCustom: true,
    ...overrides,
  };
}

beforeEach(() => {
  backend = new LocalStorageBackend(createMemoryStorage());
  usePresetStore.setState({ customPresets: [], isExporting: false });
  useSubjectStore.setState({ category: DEFAULT_PRESET.category, subject: DEFAULT_PRESET.subject });
  useOutputStore.setState({ output: DEFAULT_PRESET.output });
  useUIStore.getState().dismissToast();
  useUIStore.setState({ activeTab: 'presets' });
});

afterEach(() => {
  // The store schedules a real auto-dismiss for every toast; cancel it so nothing is left pending
  // once the suite finishes.
  useUIStore.getState().dismissToast();
});

describe('loadPreset', () => {
  it('moves the whole configuration into the studio', () => {
    const marine = PRESETS[1];
    if (!marine) throw new Error('PRESETS must hold more than one archetype.');

    usePresetStore.getState().loadPreset(marine);

    expect(useSubjectStore.getState().category).toBe(marine.category);
    expect(useSubjectStore.getState().subject).toEqual(marine.subject);
    expect(useOutputStore.getState().output).toEqual(marine.output);
    expect(useUIStore.getState().activeTab).toBe('studio');
    expect(useUIStore.getState().toastMessage).toContain(marine.name);
  });
});

describe('saveCustomPreset', () => {
  it('persists the studio state under the given name', async () => {
    useSubjectStore.getState().setField('role', 'Lamplighter');
    await usePresetStore.getState().saveCustomPreset('  My Archetype  ');

    const [saved] = usePresetStore.getState().customPresets;
    expect(saved?.name).toBe('My Archetype');
    expect(saved?.subject.role).toBe('Lamplighter');
    expect(saved?.isCustom).toBe(true);

    // And it is in storage, not merely in the store.
    await expect(backend.listPresets()).resolves.toHaveLength(1);
  });

  it('ignores a blank name without touching storage', async () => {
    await usePresetStore.getState().saveCustomPreset('   ');
    expect(usePresetStore.getState().customPresets).toHaveLength(0);
    await expect(backend.listPresets()).resolves.toHaveLength(0);
  });

  it('reports a failed write instead of showing a preset that was never saved', async () => {
    backend = createFailingBackend();
    await usePresetStore.getState().saveCustomPreset('Doomed');

    expect(usePresetStore.getState().customPresets).toHaveLength(0);
    expect(useUIStore.getState().toastMessage).toBe('Could not save that preset');
  });
});

describe('deleteCustomPreset', () => {
  it('removes it from the store and from storage', async () => {
    await usePresetStore.getState().saveCustomPreset('Temporary');
    const [saved] = usePresetStore.getState().customPresets;
    if (!saved) throw new Error('the preset should have been saved.');

    await usePresetStore.getState().deleteCustomPreset(saved.id);

    expect(usePresetStore.getState().customPresets).toHaveLength(0);
    await expect(backend.listPresets()).resolves.toHaveLength(0);
  });
});

describe('exportPresetsJSON', () => {
  it('includes the built-ins alongside the custom presets', async () => {
    await usePresetStore.getState().saveCustomPreset('Mine');

    const parsed: unknown = JSON.parse(usePresetStore.getState().exportPresetsJSON());
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(PRESETS.length + 1);
  });
});

describe('importPresetsJSON', () => {
  it('replaces the stored collection with the pack contents', async () => {
    await usePresetStore.getState().saveCustomPreset('Will be replaced');
    await usePresetStore.getState().importPresetsJSON(packFile([customPreset()]));

    const { customPresets, isExporting } = usePresetStore.getState();
    expect(customPresets.map((preset) => preset.name)).toEqual(['Imported Knight']);
    expect(isExporting).toBe(false);
    await expect(backend.listPresets()).resolves.toHaveLength(1);
  });

  it('skips built-ins, so re-importing an export does not duplicate them', async () => {
    await usePresetStore.getState().saveCustomPreset('Mine');
    const exported: unknown = JSON.parse(usePresetStore.getState().exportPresetsJSON());
    if (!Array.isArray(exported)) throw new Error('the export should be an array.');

    await usePresetStore.getState().importPresetsJSON(packFile(exported));

    const { customPresets } = usePresetStore.getState();
    expect(customPresets).toHaveLength(1);
    expect(customPresets[0]?.name).toBe('Mine');
  });

  it('refuses a pack with no custom presets rather than deleting everything', async () => {
    await usePresetStore.getState().saveCustomPreset('Keep me');
    await usePresetStore.getState().importPresetsJSON(packFile(PRESETS));

    expect(usePresetStore.getState().customPresets.map((preset) => preset.name)).toEqual(['Keep me']);
    expect(useUIStore.getState().toastMessage).toBe('No custom presets found in that file');
  });

  it('rejects a file that is not JSON at all, and clears the busy flag', async () => {
    const notJson = new File(['<html>not a pack</html>'], 'page.html', { type: 'text/html' });
    await usePresetStore.getState().importPresetsJSON(notJson);

    expect(useUIStore.getState().toastMessage).toBe('That file is not a Sprite Gubbins preset pack');
    expect(usePresetStore.getState().isExporting).toBe(false);
  });

  it('drops entries it cannot vouch for and keeps the rest', async () => {
    const pack = [customPreset({ id: 'custom-good', name: 'Good' }), { id: 42 }, null];
    await usePresetStore.getState().importPresetsJSON(packFile(pack));

    expect(usePresetStore.getState().customPresets.map((preset) => preset.name)).toEqual(['Good']);
  });
});

describe('fetchCustomPresets', () => {
  it('loads what a previous session stored', async () => {
    await backend.savePreset(customPreset({ id: 'custom-from-last-time', name: 'Last Time' }));
    await usePresetStore.getState().fetchCustomPresets();

    expect(usePresetStore.getState().customPresets.map((preset) => preset.name)).toEqual(['Last Time']);
  });

  it('reports a failed read', async () => {
    backend = createFailingBackend();
    await usePresetStore.getState().fetchCustomPresets();

    expect(usePresetStore.getState().customPresets).toHaveLength(0);
    expect(useUIStore.getState().toastMessage).toBe('Could not load your saved presets');
  });
});
