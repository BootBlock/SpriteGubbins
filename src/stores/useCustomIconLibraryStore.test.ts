import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CUSTOM_ICON_NOTICES } from '../constants/iconCatalogue/customIconNotices.ts';
import { cataloguePicks } from '../constants/iconCatalogue/cataloguePicks.ts';
import { DEFAULT_PROJECT_ID } from '../constants/projects.ts';
import type { PersistenceBackend } from '../db/backend.ts';
import { HELD_ELSEWHERE_REFUSAL, HeldElsewhereBackend } from '../db/heldElsewhereBackend.ts';
import { LocalStorageBackend } from '../db/localStorageBackend.ts';
import { toCustomIconRow } from '../db/localStorageRows.ts';
import { STORAGE_KEYS } from '../db/schema.ts';
import { createMemoryStorage } from '../db/webStorage.ts';
import { createFailingBackend } from '../test/backendDoubles.ts';
import { RELIC, RELIC_DRAFT, SPELL, TOGGLE, customPick } from '../test/customIcons.ts';
import {
  HARBOUR,
  iconLibrary,
  iconStudio,
  libraryEntries,
  rosterIds,
  savedIcon,
} from '../test/iconLibraryStudio.ts';
import { customIconDraftOf } from '../utils/customIconDraftOf.ts';
import { canUndoStudio } from '../utils/studioHistory.ts';
import { useCustomIconLibraryStore } from './useCustomIconLibraryStore.ts';
import { useSubjectStore } from './useSubjectStore.ts';
import { useUIStore } from './useUIStore.ts';

/**
 * The icon library's store, over a real `LocalStorageBackend` in memory: what an add, a change, a tick,
 * a keep and a delete do to the set and to the project's library, and what each says when storage
 * refuses it.
 */

let backend: PersistenceBackend = new LocalStorageBackend(createMemoryStorage());

vi.mock('../db/database.ts', () => ({
  getDatabase: () => Promise.resolve(backend),
}));

const store = () => useCustomIconLibraryStore.getState();
const toast = () => useUIStore.getState().toastMessage;

beforeEach(async () => {
  backend = new LocalStorageBackend(createMemoryStorage());
  await iconLibrary(backend, []);
  iconStudio(cataloguePicks(['heal-minor']));
  useUIStore.getState().dismissToast();
});

describe('useCustomIconLibraryStore', () => {
  it('loads every project’s library, keeping the first of two rows answering to one slot', async () => {
    // Under stored projects, or the boot-time discard empties the library as one filed under nothing.
    const storage = createMemoryStorage();
    await new LocalStorageBackend(storage).saveProject(HARBOUR);
    storage.setItem(
      STORAGE_KEYS.customIcons,
      JSON.stringify([
        toCustomIconRow(savedIcon(RELIC)),
        toCustomIconRow({ ...savedIcon(RELIC), id: 'later', entry: { ...RELIC, look: 'a second relic' } }),
        toCustomIconRow(savedIcon(RELIC, HARBOUR.id)),
      ]),
    );
    backend = new LocalStorageBackend(storage);

    await store().fetchCustomIcons();

    expect(store().icons).toEqual([savedIcon(RELIC), savedIcon(RELIC, HARBOUR.id)]);
  });

  it('says so when the library cannot be read', async () => {
    backend = createFailingBackend();
    await store().fetchCustomIcons();
    expect(toast()).toBe('Could not load your icon library');
  });

  it('puts a new icon on the set as one act and saves it to the project’s library', async () => {
    expect(await store().writeCustomIcon(DEFAULT_PROJECT_ID, RELIC_DRAFT, null)).toBe(true);

    expect(rosterIds()).toEqual(['heal-minor', RELIC.id]);
    expect(libraryEntries()).toEqual([RELIC]);
    await vi.waitFor(async () => {
      expect((await backend.listCustomIcons()).map((icon) => icon.projectId)).toEqual([DEFAULT_PROJECT_ID]);
    });

    // Undo takes the set's copy back; the library is stored work, as a saved preset is.
    useSubjectStore.getState().undoStudio();
    expect(rosterIds()).toEqual(['heal-minor']);
    expect(libraryEntries()).toEqual([RELIC]);
  });

  it('refuses a draft the check refuses, changing neither the set nor the library', async () => {
    expect(
      await store().writeCustomIcon(DEFAULT_PROJECT_ID, { ...RELIC_DRAFT, look: 'a [SEC:X]' }, null),
    ).toBe(false);
    expect(rosterIds()).toEqual(['heal-minor']);
    expect(await backend.listCustomIcons()).toEqual([]);
    expect(canUndoStudio(useSubjectStore.getState().history)).toBe(false);
  });

  it('changes a ticked icon on the set and in the library, keeping its library row', async () => {
    await iconLibrary(backend, [savedIcon(RELIC)]);
    iconStudio([customPick(RELIC)]);

    const draft = { ...RELIC_DRAFT, role: 'Vault pass' };
    expect(await store().writeCustomIcon(DEFAULT_PROJECT_ID, draft, RELIC.id)).toBe(true);

    const changed = { ...RELIC, id: 'vault-pass', role: 'Vault pass' };
    expect(useSubjectStore.getState().subject.icons?.picks).toEqual([customPick(changed)]);
    await vi.waitFor(async () => {
      expect(await backend.listCustomIcons()).toEqual([{ ...savedIcon(RELIC), entry: changed }]);
    });
  });

  it('changes a library icon the set does not hold in the library alone', async () => {
    await iconLibrary(backend, [savedIcon(SPELL)]);

    const draft = { ...customIconDraftOf(SPELL), look: 'a folding lattice' };
    expect(await store().writeCustomIcon(DEFAULT_PROJECT_ID, draft, SPELL.id)).toBe(true);

    expect(rosterIds()).toEqual(['heal-minor']);
    expect(libraryEntries()).toEqual([{ ...SPELL, look: 'a folding lattice' }]);
    expect(canUndoStudio(useSubjectStore.getState().history)).toBe(false);
  });

  it('saves a change to an icon only the set held into the library as well', async () => {
    iconStudio([customPick(RELIC)]);
    await store().writeCustomIcon(DEFAULT_PROJECT_ID, { ...RELIC_DRAFT, look: 'a cracked card' }, RELIC.id);
    expect(libraryEntries()).toEqual([{ ...RELIC, look: 'a cracked card' }]);
  });

  it('shows a new icon in the library in the same act as the set takes it', async () => {
    const writing = store().writeCustomIcon(DEFAULT_PROJECT_ID, RELIC_DRAFT, null);
    // Nothing awaited yet: the row must not read as one the library does not hold.
    expect(rosterIds()).toEqual(['heal-minor', RELIC.id]);
    expect(libraryEntries()).toEqual([RELIC]);
    await writing;
    expect(libraryEntries()).toEqual([RELIC]);
  });

  it('keeps the set’s new icon when the library refuses it, and says which half failed', async () => {
    backend = createFailingBackend();
    expect(await store().writeCustomIcon(DEFAULT_PROJECT_ID, RELIC_DRAFT, null)).toBe(true);
    expect(rosterIds()).toEqual(['heal-minor', RELIC.id]);
    await vi.waitFor(() => {
      expect(toast()).toBe(CUSTOM_ICON_NOTICES.setOnlyAfterRefusal);
    });
    expect(store().icons).toEqual([]);
  });

  it('names another tab as the reason, where another tab holds the library', async () => {
    backend = new HeldElsewhereBackend();
    await store().writeCustomIcon(DEFAULT_PROJECT_ID, RELIC_DRAFT, null);
    await vi.waitFor(() => {
      expect(toast()).toBe(`${CUSTOM_ICON_NOTICES.setOnlyAfterRefusal} ${HELD_ELSEWHERE_REFUSAL}`);
    });
  });

  it('keeps the form open over a library-only change the library refuses', async () => {
    await iconLibrary(backend, [savedIcon(SPELL)]);
    backend = createFailingBackend();
    const draft = { ...customIconDraftOf(SPELL), look: 'a folding lattice' };
    expect(await store().writeCustomIcon(DEFAULT_PROJECT_ID, draft, SPELL.id)).toBe(false);
    expect(toast()).toBe('Could not save your changes to that icon');
    // The row shown while the write was in flight is put back as it was.
    expect(libraryEntries()).toEqual([SPELL]);
  });

  it('files nothing where no project has loaded, and says the set alone has it', async () => {
    expect(await store().writeCustomIcon('', RELIC_DRAFT, null)).toBe(true);
    expect(rosterIds()).toEqual(['heal-minor', RELIC.id]);
    await vi.waitFor(() => {
      expect(toast()).toBe(CUSTOM_ICON_NOTICES.setOnlyAfterRefusal);
    });
    expect(await backend.listCustomIcons()).toEqual([]);
  });

  it('ticks a library icon onto the set as one act, and refuses one whose slot the set holds', async () => {
    await iconLibrary(backend, [savedIcon(SPELL)]);
    expect(store().tickCustomIcon(DEFAULT_PROJECT_ID, SPELL)).toEqual([]);
    expect(rosterIds()).toEqual(['heal-minor', SPELL.id]);
    expect(
      store()
        .tickCustomIcon(DEFAULT_PROJECT_ID, SPELL)
        .map((refusal) => refusal.field),
    ).toEqual(['role']);
  });

  it('keeps an icon only the set holds in the library, and refuses a slot the library holds', async () => {
    await iconLibrary(backend, [savedIcon(TOGGLE)]);
    iconStudio([
      customPick(RELIC),
      customPick({ ...RELIC, id: 'cloak-field-idle', role: 'Cloak field idle' }),
    ]);

    await store().keepCustomIcon(DEFAULT_PROJECT_ID, RELIC);
    expect(libraryEntries()).toEqual([RELIC, TOGGLE]);
    expect(toast()).toBe(CUSTOM_ICON_NOTICES.kept(RELIC.role));

    await store().keepCustomIcon(DEFAULT_PROJECT_ID, {
      ...RELIC,
      id: 'cloak-field-idle',
      role: 'Cloak field idle',
    });
    expect(libraryEntries().map((entry) => entry.id)).toEqual([RELIC.id, TOGGLE.id]);
    expect(toast()).toContain('`cloak-field-idle`');
  });

  it('deletes a library icon and leaves the set’s copy', async () => {
    await iconLibrary(backend, [savedIcon(RELIC), savedIcon(SPELL)]);
    iconStudio([customPick(RELIC)]);

    await store().deleteCustomIcon(savedIcon(RELIC).id);

    expect(libraryEntries()).toEqual([SPELL]);
    expect(await backend.listCustomIcons()).toEqual([savedIcon(SPELL)]);
    expect(useSubjectStore.getState().subject.icons?.picks).toEqual([customPick(RELIC)]);
    expect(toast()).toBe(CUSTOM_ICON_NOTICES.deleted(RELIC.role));
  });

  it('keeps showing an icon whose delete storage refused', async () => {
    await iconLibrary(backend, [savedIcon(RELIC)]);
    backend = createFailingBackend();
    await store().deleteCustomIcon(savedIcon(RELIC).id);
    expect(libraryEntries()).toEqual([RELIC]);
    expect(toast()).toBe('Could not delete that icon from your library');
  });

  it('points the library at another project without storing anything', () => {
    store().chooseProject(HARBOUR.id);
    expect(store().chosenProjectId).toBe(HARBOUR.id);
  });
});
