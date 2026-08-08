import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../constants/settings.ts';
import type { PersistenceBackend } from '../db/backend.ts';
import { LocalStorageBackend } from '../db/localStorageBackend.ts';
import { createMemoryStorage } from '../db/webStorage.ts';
import { createFailingBackend } from '../test/backendDoubles.ts';
import { createRefusingStorage } from '../test/storageDoubles.ts';
import { useSettingsStore } from './useSettingsStore.ts';
import { resetNavigationForTests, useUIStore } from './useUIStore.ts';

/**
 * The settings store's two jobs, and the two places it deliberately behaves unlike its neighbours.
 *
 * Both are about storage saying no, and both go the *opposite* way to the preset and history
 * stores: a failed read is silent, because the defaults are a complete and correct answer, and a
 * failed write leaves the change applied, because a preference the user can see working is not the
 * lie an unsaved preset would be. Neither is obvious from the code, so both are pinned here.
 *
 * Backed by a real `LocalStorageBackend` over an in-memory store, exactly as the preset and history
 * store tests are: only the module that *chooses* a backend is mocked, since that choice needs a
 * browser this environment does not have. `backend` is read lazily inside the factory, which is
 * what lets a case swap in a failing one after the mock has been hoisted.
 */
let backend: PersistenceBackend = new LocalStorageBackend(createMemoryStorage());

vi.mock('../db/database.ts', () => ({
  getDatabase: () => Promise.resolve(backend),
}));

beforeEach(() => {
  backend = new LocalStorageBackend(createMemoryStorage());
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS });
  useUIStore.getState().dismissToast();
  useUIStore.setState({ activeTab: 'studio' });
  // The "has the user navigated yet" flag is a fact about a session, and each case is a fresh load.
  resetNavigationForTests();
});

afterEach(() => {
  // Every toast schedules a real auto-dismiss; cancel it so nothing is left pending after the suite.
  useUIStore.getState().dismissToast();
});

describe('useSettingsStore — hydration', () => {
  it('brings stored settings into the store', async () => {
    await backend.saveSettings({ ...DEFAULT_SETTINGS, accentHue: 'gold', motion: 'reduced' });

    await useSettingsStore.getState().fetchSettings();

    expect(useSettingsStore.getState().settings.accentHue).toBe('gold');
    expect(useSettingsStore.getState().settings.motion).toBe('reduced');
  });

  it('opens the app on the stored view', async () => {
    await backend.saveSettings({ ...DEFAULT_SETTINGS, openingView: 'quantise' });

    await useSettingsStore.getState().fetchSettings();

    expect(useUIStore.getState().activeTab).toBe('quantise');
  });

  it('leaves a user who has already navigated where they went', async () => {
    // The window between first paint and the database opening is small and is not zero — it is a
    // worker, a WebAssembly module and an OPFS pool — and someone who knows where they are going
    // can cross it. A preference about how the app *opens* has nothing left to say once they have
    // moved, and pulling them back would be the app overruling the person using it.
    await backend.saveSettings({ ...DEFAULT_SETTINGS, openingView: 'quantise' });

    useUIStore.getState().setActiveTab('presets');
    await useSettingsStore.getState().fetchSettings();

    expect(useUIStore.getState().activeTab).toBe('presets');
  });

  it('keeps the defaults, and stays quiet, when storage cannot be read at all', async () => {
    backend = createFailingBackend();

    await useSettingsStore.getState().fetchSettings();

    expect(useSettingsStore.getState().settings).toEqual(DEFAULT_SETTINGS);
    // Deliberately no toast. Every other store's failed read loses something the user put there;
    // this one has a complete answer, on a screen that is working, about which there is nothing to
    // do — so a notification would report a problem the reader cannot act on.
    expect(useUIStore.getState().toastMessage).toBeNull();
  });
});

describe('useSettingsStore — changing a preference', () => {
  it('applies the change and persists it', async () => {
    await useSettingsStore.getState().updateSettings({ accentHue: 'magenta' });

    expect(useSettingsStore.getState().settings.accentHue).toBe('magenta');
    expect((await backend.loadSettings()).accentHue).toBe('magenta');
  });

  it('writes the whole set, so one change cannot drop another', async () => {
    // The stored settings are a single object, and a patch that wrote only its own field would
    // leave that object half from this session and half from the last.
    await useSettingsStore.getState().updateSettings({ accentHue: 'lime' });
    await useSettingsStore.getState().updateSettings({ ambientBackdrop: false });

    expect(await backend.loadSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      accentHue: 'lime',
      ambientBackdrop: false,
    });
  });

  it('keeps the change on screen when storage refuses it, and says which half failed', async () => {
    // The deliberate divergence from the preset and history stores, which revert. A preference is
    // not a record: the accent the user picked is on the page in front of them and works for the
    // rest of the session, so undoing a click they can see took effect — to enforce a durability
    // they were never promised — would be the worse answer. What is owed is the truth about it.
    backend = new LocalStorageBackend(createRefusingStorage());

    await useSettingsStore.getState().updateSettings({ accentHue: 'azure' });

    expect(useSettingsStore.getState().settings.accentHue).toBe('azure');
    expect(useUIStore.getState().toastMessage).toMatch(/could not be saved/i);
  });
});
