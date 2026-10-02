import { create } from 'zustand';
import { CUSTOM_ICON_NOTICES } from '../constants/iconCatalogue/customIconNotices.ts';
import { getDatabase } from '../db/database.ts';
import { HELD_ELSEWHERE_REFUSAL } from '../db/heldElsewhereBackend.ts';
import { isHeldElsewhere, storageFailure } from '../db/storageFailure.ts';
import type { CustomIconDraft, CustomIconRefusal } from '../types/customIconDraft.ts';
import type { CustomIconEntry } from '../types/iconRoster.ts';
import type { SavedCustomIcon } from '../types/savedCustomIcon.ts';
import { checkCustomIcon } from '../utils/checkCustomIcon.ts';
import { customIconDraftOf } from '../utils/customIconDraftOf.ts';
import { firstOfEachSlot } from '../utils/firstOfEachSlot.ts';
import { useSubjectStore } from './useSubjectStore.ts';
import { useUIStore } from './useUIStore.ts';

/**
 * Each project's library of icons of the reader's own, and the acts that move an entry between a
 * library and the studio's icon set.
 *
 * **Every project's library is held, as the two preset collections hold every project's presets**,
 * because the library pack exports them all and the Projects view counts them; the catalogue dialog
 * narrows them to the project it shows (`useIconLibrary`). Which project that is lives here, chosen in
 * the dialog and kept for as long as the tab is open: it is a choice the reader makes in the control
 * that asks, as the save panels' project is, and a fresh tab opens on the first project, where those
 * open too.
 *
 * **The set and the library hold separate copies** (`SavedCustomIcon`). An add or an edit made in the
 * dialog writes both — the set through `useSubjectStore`'s own actions, as one act Undo takes back,
 * and then the library — and a tick copies a library entry onto the set. Undo moves the set alone:
 * the library is stored data, as a saved preset is, and an entry leaves it only by its Delete.
 *
 * **Every check is `checkCustomIcon`'s, against the set and this project's library together**, so no
 * slot name answers to two entries anywhere a tick could bring them together.
 */
export interface CustomIconLibraryState {
  /** Every project's library entries, as the backend lists them. */
  readonly icons: readonly SavedCustomIcon[];
  /** The project the catalogue dialog's library was last pointed at, or empty for the first project. */
  readonly chosenProjectId: string;

  /** Load every library. Called once on boot, and again after a project delete or an import. */
  fetchCustomIcons(): Promise<void>;
  /** Point the catalogue dialog's library at another project. Nothing stored changes. */
  chooseProject(projectId: string): void;
  /**
   * Add a new entry (`replacing` null) or change the entry whose slot is `replacing`, from the form.
   *
   * A new entry, or a change to one the set holds, goes onto the set as one act and is then saved into
   * `projectId`'s library; a change to a library entry the set does not hold changes the library alone.
   * Resolves whether the form may close: `false` where the check refuses the draft — the form shows the
   * same refusals — or where a library-only change could not be stored. A change the set takes resolves
   * at once, before the library's write lands, and a refusal there raises a notice, since the set holds
   * the icon either way.
   */
  writeCustomIcon(projectId: string, draft: CustomIconDraft, replacing: string | null): Promise<boolean>;
  /** Tick a library entry onto the set, as one act; the refusals say why where it does not fit. */
  tickCustomIcon(projectId: string, entry: CustomIconEntry): readonly CustomIconRefusal[];
  /** Save an entry the set holds, and no library of this project does, into `projectId`'s library. */
  keepCustomIcon(projectId: string, entry: CustomIconEntry): Promise<void>;
  /** Delete one library entry. Every set that holds a copy keeps it. */
  deleteCustomIcon(id: string): Promise<void>;
}

/** One project's library entries, as the check measures them. */
function libraryOf(icons: readonly SavedCustomIcon[], projectId: string): CustomIconEntry[] {
  return icons.filter((icon) => icon.projectId === projectId).map((icon) => icon.entry);
}

function notify(message: string): void {
  useUIStore.getState().showToast(message);
}

export const useCustomIconLibraryStore = create<CustomIconLibraryState>((set, get) => {
  /**
   * Write `entry` into `projectId`'s library, over the row whose slot was `replacing` (or the entry's
   * own) where one is there, so an edit keeps its library row. Refused where no project has loaded to
   * file it under, which leaves the reader the same notice as a refused write.
   *
   * **Shown before the write lands, and withdrawn if it is refused** — unlike the preset stores, which
   * show a save only once it is stored. The set takes an added or changed icon in the same act, so
   * until the library answers, the icon's row would read as one the library does not hold and flash
   * that warning. The row is put back as it was on a refusal, and re-read from the backend on success,
   * because each backend decides the order it lists rows in.
   */
  async function store(projectId: string, entry: CustomIconEntry, replacing: string | null): Promise<void> {
    if (projectId === '') throw new Error('No project has loaded to file the icon under');
    const slot = replacing ?? entry.id;
    const held = get().icons.find((icon) => icon.projectId === projectId && icon.entry.id === slot);
    const icon: SavedCustomIcon = { id: held?.id ?? `custom-icon-${crypto.randomUUID()}`, projectId, entry };
    set((state) => ({ icons: [icon, ...state.icons.filter((each) => each.id !== icon.id)] }));
    try {
      const database = await getDatabase();
      await database.saveCustomIcon(icon);
      set({ icons: firstOfEachSlot(await database.listCustomIcons()) });
    } catch (error) {
      set((state) => ({
        icons:
          held === undefined
            ? state.icons.filter((each) => each.id !== icon.id)
            : state.icons.map((each) => (each.id === icon.id ? held : each)),
      }));
      throw error;
    }
  }

  return {
    icons: [],
    chosenProjectId: '',

    fetchCustomIcons: async () => {
      try {
        const database = await getDatabase();
        set({ icons: firstOfEachSlot(await database.listCustomIcons()) });
      } catch (error) {
        notify(storageFailure('Could not load your icon library', error));
      }
    },

    chooseProject: (projectId) => {
      set({ chosenProjectId: projectId });
    },

    writeCustomIcon: async (projectId, draft, replacing) => {
      const roster = useSubjectStore.getState().subject.icons;
      if (roster === undefined) return false;
      const library = libraryOf(get().icons, projectId);
      const { entry } = checkCustomIcon(draft, roster.picks, replacing, library);
      if (entry === null) return false;
      const onSet =
        replacing === null ||
        roster.picks.some((pick) => pick.source === 'CUSTOM' && pick.entry.id === replacing);
      if (onSet) {
        const subject = useSubjectStore.getState();
        const refused =
          replacing === null
            ? subject.addCustomIcon(draft, library)
            : subject.updateCustomIcon(replacing, draft, library);
        if (refused.length > 0) return false;
        // The set holds it now, so the form closes without waiting for the library, which reports
        // its own refusal: held open over the write, the form would show the entry's own slot as taken.
        void store(projectId, entry, replacing).catch((error: unknown) => {
          const applied = CUSTOM_ICON_NOTICES.setOnlyAfterRefusal;
          notify(isHeldElsewhere(error) ? `${applied} ${HELD_ELSEWHERE_REFUSAL}` : applied);
        });
        return true;
      }
      try {
        await store(projectId, entry, replacing);
        return true;
      } catch (error) {
        notify(storageFailure('Could not save your changes to that icon', error));
        return false;
      }
    },

    tickCustomIcon: (projectId, entry) => {
      const others = libraryOf(get().icons, projectId).filter((held) => held.id !== entry.id);
      return useSubjectStore.getState().addCustomIcon(customIconDraftOf(entry), others);
    },

    keepCustomIcon: async (projectId, entry) => {
      const picks = useSubjectStore.getState().subject.icons?.picks ?? [];
      const others = picks.filter((pick) => pick.source !== 'CUSTOM' || pick.entry.id !== entry.id);
      const check = checkCustomIcon(
        customIconDraftOf(entry),
        others,
        null,
        libraryOf(get().icons, projectId),
      );
      const [refusal] = check.refusals;
      if (check.entry === null) {
        if (refusal !== undefined) notify(refusal.message);
        return;
      }
      try {
        await store(projectId, check.entry, null);
        notify(CUSTOM_ICON_NOTICES.kept(check.entry.role));
      } catch (error) {
        notify(storageFailure('Could not save that icon to your library', error));
      }
    },

    deleteCustomIcon: async (id) => {
      const icon = get().icons.find((held) => held.id === id);
      if (icon === undefined) return;
      try {
        const database = await getDatabase();
        await database.deleteCustomIcon(id);
        set((state) => ({ icons: state.icons.filter((held) => held.id !== id) }));
        notify(CUSTOM_ICON_NOTICES.deleted(icon.entry.role));
      } catch (error) {
        notify(storageFailure('Could not delete that icon from your library', error));
      }
    },
  };
});
