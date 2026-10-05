import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cataloguePicks } from '../constants/iconCatalogue/cataloguePicks.ts';
import { DEFAULT_PROJECT_ID } from '../constants/projects.ts';
import type { PersistenceBackend } from '../db/backend.ts';
import { LocalStorageBackend } from '../db/localStorageBackend.ts';
import { createMemoryStorage } from '../db/webStorage.ts';
import { RELIC, RELIC_DRAFT, SPELL, customPick } from '../test/customIcons.ts';
import { customIconDraftOf } from '../utils/customIconDraftOf.ts';
import { HARBOUR, iconLibrary, iconStudio, libraryEntries, savedIcon } from '../test/iconLibraryStudio.ts';
import type { SavedCustomIcon } from '../types/savedCustomIcon.ts';
import { useCustomIconLibraryStore } from './useCustomIconLibraryStore.ts';
import { useLibraryTransferStore } from './useLibraryTransferStore.ts';
import { useProjectStore } from './useProjectStore.ts';
import { useUIStore } from './useUIStore.ts';

/**
 * Library writes while others are in flight: one at a time, each measured against what storage holds
 * when its turn comes, and a row shown before its write lands kept through any refresh meanwhile — so
 * storage never holds two rows answering to one slot of a project, however quickly the reader acts.
 */

/** A fallback backend whose library saves wait to be released, so a write can be held in flight. */
class HeldSaves extends LocalStorageBackend {
  private release: () => void = () => undefined;
  private gate = Promise.resolve();

  hold(): void {
    this.gate = new Promise((resolve) => {
      this.release = resolve;
    });
  }

  let(): void {
    this.release();
  }

  override async saveCustomIcon(icon: SavedCustomIcon): Promise<void> {
    await this.gate;
    return super.saveCustomIcon(icon);
  }
}

let backend: PersistenceBackend = new LocalStorageBackend(createMemoryStorage());

vi.mock('../db/database.ts', () => ({
  getDatabase: () => Promise.resolve(backend),
}));

const store = () => useCustomIconLibraryStore.getState();

/** One turn of the event loop, by which every promise not waiting on a held save has settled. */
const settled = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

/** The rows storage holds under `slot` in the Default project. */
async function storedUnder(slot: string): Promise<readonly SavedCustomIcon[]> {
  return (await backend.listCustomIcons()).filter(
    (icon) => icon.projectId === DEFAULT_PROJECT_ID && icon.entry.id === slot,
  );
}

beforeEach(async () => {
  backend = new HeldSaves(createMemoryStorage());
  await iconLibrary(backend, []);
  iconStudio(cataloguePicks(['heal-minor']));
  useUIStore.getState().dismissToast();
});

describe('library writes in flight together', () => {
  it('keeps a row shown early through a refresh that lands before its write', async () => {
    const held = backend as HeldSaves;
    held.hold();
    const writing = store().writeCustomIcon(DEFAULT_PROJECT_ID, RELIC_DRAFT, null);

    // A refresh from storage, which does not hold the relic yet, must not take its row away.
    await store().fetchCustomIcons();
    expect(libraryEntries()).toEqual([RELIC]);

    held.let();
    await writing;
    await vi.waitFor(async () => {
      expect(await storedUnder(RELIC.id)).toHaveLength(1);
    });
    expect(libraryEntries()).toEqual([RELIC]);
  });

  it('refuses a write whose slot storage already holds, though the shown list let it through', async () => {
    // Storage holds the relic under a row the store has not listed yet — the gap a refresh opens.
    await backend.saveCustomIcon({ ...savedIcon(RELIC), id: 'landed-first' });
    iconStudio([customPick(RELIC)]);

    await store().keepCustomIcon(DEFAULT_PROJECT_ID, RELIC);

    expect(await storedUnder(RELIC.id)).toEqual([{ ...savedIcon(RELIC), id: 'landed-first' }]);
    expect(useUIStore.getState().toastMessage).toBe('Could not save that icon to your library');
  });

  it('runs writes one at a time, so the second meets the first in storage', async () => {
    // Two library icons the set does not hold, each renamed to one name before either write lands.
    // Each passes the check against the list the store shows; measured against storage side by side,
    // both would pass there too, and storage would hold two rows answering to one file name.
    const badge = { ...RELIC, id: 'forged-corp-badge', role: 'Forged corp badge' };
    await iconLibrary(backend, [savedIcon(SPELL), savedIcon(badge)]);
    const held = backend as HeldSaves;
    held.hold();
    const first = store().writeCustomIcon(
      DEFAULT_PROJECT_ID,
      { ...customIconDraftOf(SPELL), role: 'Shared name' },
      SPELL.id,
    );
    const second = store().writeCustomIcon(
      DEFAULT_PROJECT_ID,
      { ...customIconDraftOf(badge), role: 'Shared name' },
      badge.id,
    );
    held.let();

    expect(await Promise.all([first, second])).toEqual([true, false]);
    expect(await storedUnder('shared-name')).toHaveLength(1);
    expect(await storedUnder(badge.id)).toHaveLength(1);
  });
});

describe('library writes in flight across a change that rewrites the libraries', () => {
  it('lands a write to a project before that project’s delete, so the delete takes it too', async () => {
    const held = backend as HeldSaves;
    held.hold();
    const writing = store().writeCustomIcon(HARBOUR.id, RELIC_DRAFT, null);
    const deleting = useProjectStore.getState().deleteProject(HARBOUR.id);
    // Every step either can take before the held save is taken, so the delete is as far on as it gets.
    await settled();

    held.let();
    await Promise.all([writing, deleting]);

    expect((await backend.listCustomIcons()).filter((icon) => icon.projectId === HARBOUR.id)).toEqual([]);
    expect(libraryEntries(HARBOUR.id)).toEqual([]);
  });

  it('lands a write before a pack replaces the library, so the pack is what storage holds', async () => {
    const held = backend as HeldSaves;
    held.hold();
    const writing = store().writeCustomIcon(DEFAULT_PROJECT_ID, RELIC_DRAFT, null);
    const kept = savedIcon(SPELL);
    useLibraryTransferStore.setState({
      pendingImport: {
        projects: useProjectStore.getState().projects,
        presets: [],
        quantisePresets: [],
        customIcons: [kept],
      },
    });
    const importing = useLibraryTransferStore.getState().confirmLibraryImport();
    await settled();

    held.let();
    await Promise.all([writing, importing]);

    expect(await backend.listCustomIcons()).toEqual([kept]);
  });
});
