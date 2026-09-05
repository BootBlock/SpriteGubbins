import { create } from 'zustand';
import { LIBRARY_PACK_ITEMS } from '../constants/packImport.ts';
import { getDatabase } from '../db/database.ts';
import type { LibraryPack } from '../types/libraryPack.ts';
import { describePackImported } from '../utils/packImportSummary.ts';
import { libraryPackSize, parseLibraryPack, serialiseLibraryPack } from '../utils/libraryPack.ts';
import { usePresetStore } from './usePresetStore.ts';
import { useProjectStore } from './useProjectStore.ts';
import { useQuantisePresetStore } from './useQuantisePresetStore.ts';
import { useUIStore } from './useUIStore.ts';

/**
 * Moving the whole library in and out of this browser as one file.
 *
 * **A store of its own, because it is not any one collection's job.** Each of the two collections
 * used to own a pack, and neither could own this one: a pack carries the projects, the studio
 * archetypes and the saved dial positions together, because a preset names its project by id and a
 * file holding one without the other describes a library that cannot be assembled. So the transfer
 * reads all three stores and writes all three, and it belongs beside none of them.
 *
 * Everything it touches it touches through that store's own actions, which is the rule
 * `usePresetStore` follows in reaching into the studio's three. The replacement itself is a single
 * backend call, so there is no window in which storage holds half a library — see
 * `PersistenceBackend.replaceLibrary`.
 */
export interface LibraryTransferState {
  /**
   * Whether a transfer is in flight, which is what both controls disable on.
   *
   * Only the import direction can actually be in flight — {@link exportLibraryJSON} serialises
   * synchronously — and the flag covers both anyway, which is what stops an export racing a
   * half-replaced library.
   */
  readonly isTransferring: boolean;
  /**
   * The library a parsed pack holds, waiting for the reader to agree to the replacement — `null`
   * whenever no import is being asked about. Staged in the store rather than held by the control
   * that asked, because the answer decides what happens to stored rows and that control is free to
   * unmount before it arrives.
   */
  readonly pendingImport: LibraryPack | null;

  /** The whole library as a pack file's text, built-in archetypes included. */
  exportLibraryJSON(): string;
  /**
   * Read the pack in `file` and stage it for confirmation. Nothing stored changes here — the
   * replacement itself is {@link LibraryTransferState.confirmLibraryImport}.
   */
  importLibraryJSON(file: File): Promise<void>;
  /** Replace the stored library with the staged pack. */
  confirmLibraryImport(): Promise<void>;
  /** Discard the staged pack, leaving everything stored exactly as it is. */
  cancelLibraryImport(): void;
}

export const useLibraryTransferStore = create<LibraryTransferState>((set, get) => ({
  isTransferring: false,
  pendingImport: null,

  exportLibraryJSON: () =>
    serialiseLibraryPack({
      projects: useProjectStore.getState().projects,
      presets: usePresetStore.getState().customPresets,
      quantisePresets: useQuantisePresetStore.getState().presets,
    }),

  importLibraryJSON: async (file) => {
    const { showToast } = useUIStore.getState();
    set({ isTransferring: true });
    try {
      const imported = parseLibraryPack(await file.text(), Date.now());
      if (imported === null) {
        showToast('That file is not a Sprite Gubbins library pack');
        return;
      }

      // Importing replaces the library, so a pack holding nothing is refused rather than obeyed: a
      // file exported from an install that had saved nothing would otherwise delete every project
      // and every preset this one holds.
      if (libraryPackSize(imported) === 0) {
        showToast('No projects or saved presets found in that file');
        return;
      }

      // Staged, not applied. Everything past this point is the reader's decision, and it is asked
      // on screen rather than in a tooltip — `ControlTooltip` cannot be reached by touch at all, so
      // on a phone a warning kept there is one nobody could open.
      set({ pendingImport: imported });
    } catch {
      showToast('Could not import that library pack');
    } finally {
      set({ isTransferring: false });
    }
  },

  confirmLibraryImport: async () => {
    const imported = get().pendingImport;
    if (imported === null) return;

    const { showToast } = useUIStore.getState();
    // Counted here rather than when the pack was parsed, so the sentence reports the library as it
    // stands at the moment it is replaced.
    const replacing =
      useProjectStore.getState().projects.length +
      usePresetStore.getState().customPresets.length +
      useQuantisePresetStore.getState().presets.length;
    // **Cleared before the first await, not in the `finally`.** The staged pack is this action's own
    // guard, and clearing it afterwards would leave the guard open across the whole database write:
    // a second press would run a second replace, and a press of Cancel in the same window would
    // answer “nothing of yours was deleted” over a deletion already dispatched.
    set({ isTransferring: true, pendingImport: null });
    try {
      const database = await getDatabase();
      await database.replaceLibrary(imported);
      // Re-read rather than set from the pack: each collection is ordered by the backend, and the
      // rows it now holds are what the rest of the app is about to render.
      await useProjectStore.getState().fetchProjects();
      await usePresetStore.getState().fetchCustomPresets();
      await useQuantisePresetStore.getState().fetchQuantisePresets();
      showToast(describePackImported(libraryPackSize(imported), replacing, LIBRARY_PACK_ITEMS));
    } catch {
      // Reported and left there: the reader retries from the button, rather than being asked the
      // same question again over a library nothing happened to.
      showToast('Could not import that library pack');
    } finally {
      set({ isTransferring: false });
    }
  },

  cancelLibraryImport: () => {
    // Nothing staged is nothing to cancel, so it says nothing — a toast here would answer a
    // question the reader had already answered.
    if (get().pendingImport === null) return;
    set({ pendingImport: null });
    useUIStore.getState().showToast('Import cancelled, and nothing of yours was deleted');
  },
}));
