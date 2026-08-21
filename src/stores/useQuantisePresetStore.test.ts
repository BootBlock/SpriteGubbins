import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';
import type { PersistenceBackend } from '../db/backend.ts';
import { LocalStorageBackend } from '../db/localStorageBackend.ts';
import { createMemoryStorage } from '../db/webStorage.ts';
import { createFailingBackend } from '../test/backendDoubles.ts';
import type { QuantiseDials } from '../types/quantisePreset.ts';
import { useQuantisePresetStore } from './useQuantisePresetStore.ts';
import { useQuantiseStore } from './useQuantiseStore.ts';
import { useUIStore } from './useUIStore.ts';

/**
 * Backed by a real `LocalStorageBackend` over an in-memory store rather than a hand-written fake,
 * so what these tests assert about persistence is what the app actually does — the same arrangement
 * `usePresetStore.test.ts` uses, and for the same reason. Only the module that *chooses* a backend
 * is mocked: that choice needs a browser this environment does not have.
 */
let backend: PersistenceBackend = new LocalStorageBackend(createMemoryStorage());

vi.mock('../db/database.ts', () => ({
  getDatabase: () => Promise.resolve(backend),
}));

/** A set of dial positions that differs from the defaults in every field. */
const TUNED: QuantiseDials = {
  keyingEnabled: true,
  keyTolerance: 32,
  vote: 'K_CENTROID',
  outlineExpansion: 1,
  lineStrength: 2.1,
  trimStrength: 0.6,
  inkThreshold: 72,
  fillCleanup: 8,
  colorMerge: 16,
  cleanupPasses: 2,
  dither: 'BLUE_NOISE',
  paletteSnap: 36,
  spriteGap: 3,
  duplicateTolerance: 5,
  duplicateSnap: true,
};

beforeEach(() => {
  backend = new LocalStorageBackend(createMemoryStorage());
  useQuantisePresetStore.setState({ presets: [] });
  useQuantiseStore.setState({ ...QUANTISE_DEFAULT_DIALS });
  useUIStore.getState().dismissToast();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('saveQuantisePreset', () => {
  it('stores the dials as they stand in the tab, not as they were passed in', async () => {
    useQuantiseStore.setState({ ...TUNED });

    await useQuantisePresetStore.getState().saveQuantisePreset('Flat sheets', '');

    const [stored] = await backend.listQuantisePresets();
    expect(stored?.dials).toEqual(TUNED);
  });

  it('leaves the sheet, the grid and a held palette out of what it hands to storage', async () => {
    useQuantiseStore.setState({
      ...TUNED,
      gridOverride: 6,
      lockedPalette: {
        entries: [{ r: 1, g: 2, b: 3, a: 255 }],
        sheetName: 'armour.png',
        setting: 'STRICT_32_COLOR',
      },
    });
    // Asserted on what reaches the backend, not on what comes back out of it. The reader builds a
    // fresh object holding exactly the fifteen dials, so a `saveQuantisePreset` that spread the
    // whole store — sheet, grid, locked palette and all — would still read back clean. This is the
    // only place the extra keys are still visible.
    const written = vi.spyOn(backend, 'saveQuantisePreset');

    await useQuantisePresetStore.getState().saveQuantisePreset('Flat sheets', '');

    // `toEqual` on the whole object fails on any extra key, which is what makes this an assertion
    // about the *set* rather than about three named absences.
    expect(written.mock.calls[0]?.[0].dials).toEqual(TUNED);
  });

  it('stores the description beside the name, trimmed', async () => {
    await useQuantisePresetStore.getState().saveQuantisePreset('  Flat sheets  ', '  Line art.  ');

    const [stored] = await backend.listQuantisePresets();
    expect(stored?.name).toBe('Flat sheets');
    expect(stored?.description).toBe('Line art.');
  });

  it('lets a preset be saved with no description at all', async () => {
    await useQuantisePresetStore.getState().saveQuantisePreset('Flat sheets', '');

    expect((await backend.listQuantisePresets())[0]?.description).toBe('');
  });

  it('ignores a blank name without touching storage', async () => {
    expect(await useQuantisePresetStore.getState().saveQuantisePreset('   ', 'x')).toBe(false);
    expect(await backend.listQuantisePresets()).toEqual([]);
  });

  it('updates the preset of that name rather than adding a second one', async () => {
    const store = useQuantisePresetStore.getState();
    await store.saveQuantisePreset('Flat sheets', 'First');
    const first = useQuantisePresetStore.getState().presets[0];

    useQuantiseStore.setState({ ...TUNED });
    await useQuantisePresetStore.getState().saveQuantisePreset('Flat sheets', 'Second');

    const stored = await backend.listQuantisePresets();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.id).toBe(first?.id);
    expect(stored[0]?.description).toBe('Second');
    expect(stored[0]?.dials).toEqual(TUNED);
  });

  it('treats a differently-cased name as the same one, and adopts the new spelling', async () => {
    await useQuantisePresetStore.getState().saveQuantisePreset('flat sheets', '');
    await useQuantisePresetStore.getState().saveQuantisePreset('Flat Sheets', '');

    const stored = await backend.listQuantisePresets();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.name).toBe('Flat Sheets');
  });

  it('says it saved when the name is new, and updated when it is not', async () => {
    await useQuantisePresetStore.getState().saveQuantisePreset('Flat sheets', '');
    expect(useUIStore.getState().toastMessage).toContain('Saved');

    await useQuantisePresetStore.getState().saveQuantisePreset('Flat sheets', '');
    expect(useUIStore.getState().toastMessage).toContain('Updated');
  });

  it('reports a failed write instead of showing a preset that was never saved', async () => {
    backend = createFailingBackend();

    expect(await useQuantisePresetStore.getState().saveQuantisePreset('Flat sheets', '')).toBe(false);
    expect(useQuantisePresetStore.getState().presets).toEqual([]);
    expect(useUIStore.getState().toastMessage).toBe('Could not save those settings');
  });
});

describe('loadQuantisePreset', () => {
  it('moves every dial to the saved position', async () => {
    useQuantiseStore.setState({ ...TUNED });
    await useQuantisePresetStore.getState().saveQuantisePreset('Flat sheets', '');
    useQuantiseStore.setState({ ...QUANTISE_DEFAULT_DIALS });

    const preset = useQuantisePresetStore.getState().presets[0];
    if (preset === undefined) throw new Error('expected the preset to have been stored');
    useQuantisePresetStore.getState().loadQuantisePreset(preset);

    const { keyingEnabled, vote, colorMerge, spriteGap } = useQuantiseStore.getState();
    expect({ keyingEnabled, vote, colorMerge, spriteGap }).toEqual({
      keyingEnabled: TUNED.keyingEnabled,
      vote: TUNED.vote,
      colorMerge: TUNED.colorMerge,
      spriteGap: TUNED.spriteGap,
    });
  });

  it('leaves the sheet, the grid and a held palette exactly where they were', () => {
    const lockedPalette = {
      entries: [{ r: 1, g: 2, b: 3, a: 255 }],
      sheetName: 'armour.png',
      setting: 'STRICT_32_COLOR',
    };
    useQuantiseStore.setState({ gridOverride: 6, lockedPalette });

    useQuantisePresetStore
      .getState()
      .loadQuantisePreset({ id: 'quantise-1', name: 'Flat sheets', description: '', dials: TUNED });

    expect(useQuantiseStore.getState().gridOverride).toBe(6);
    expect(useQuantiseStore.getState().lockedPalette).toBe(lockedPalette);
  });

  it('names the preset it loaded, so a click on the wrong row is visible', () => {
    useQuantisePresetStore
      .getState()
      .loadQuantisePreset({ id: 'quantise-1', name: 'Flat sheets', description: '', dials: TUNED });

    expect(useUIStore.getState().toastMessage).toContain('Flat sheets');
  });
});

describe('deleteQuantisePreset', () => {
  it('removes it from the store and from storage', async () => {
    await useQuantisePresetStore.getState().saveQuantisePreset('Flat sheets', '');
    const id = useQuantisePresetStore.getState().presets[0]?.id ?? '';

    await useQuantisePresetStore.getState().deleteQuantisePreset(id);

    expect(useQuantisePresetStore.getState().presets).toEqual([]);
    expect(await backend.listQuantisePresets()).toEqual([]);
  });

  it('reports a failed delete, and keeps showing the preset', async () => {
    await useQuantisePresetStore.getState().saveQuantisePreset('Flat sheets', '');
    backend = createFailingBackend();

    await useQuantisePresetStore.getState().deleteQuantisePreset('quantise-1');

    expect(useQuantisePresetStore.getState().presets).toHaveLength(1);
    expect(useUIStore.getState().toastMessage).toBe('Could not delete that preset');
  });
});

describe('fetchQuantisePresets', () => {
  it('brings the stored collection into the store', async () => {
    useQuantiseStore.setState({ ...TUNED });
    await useQuantisePresetStore.getState().saveQuantisePreset('Flat sheets', 'Line art.');
    useQuantisePresetStore.setState({ presets: [] });

    await useQuantisePresetStore.getState().fetchQuantisePresets();

    expect(useQuantisePresetStore.getState().presets).toHaveLength(1);
    expect(useQuantisePresetStore.getState().presets[0]?.dials).toEqual(TUNED);
  });

  it('reports a read it could not make rather than showing an empty collection silently', async () => {
    backend = createFailingBackend();

    await useQuantisePresetStore.getState().fetchQuantisePresets();

    expect(useUIStore.getState().toastMessage).toBe('Could not load your saved quantiser settings');
  });
});
