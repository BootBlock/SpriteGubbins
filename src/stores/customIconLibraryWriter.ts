import { getDatabase } from '../db/database.ts';
import type { CustomIconEntry } from '../types/iconRoster.ts';
import type { SavedCustomIcon } from '../types/savedCustomIcon.ts';
import { checkCustomIcon } from '../utils/checkCustomIcon.ts';
import { customIconDraftOf } from '../utils/customIconDraftOf.ts';
import { firstOfEachSlot } from '../utils/firstOfEachSlot.ts';
import { createSerialQueue } from '../utils/serialQueue.ts';

/** The part of the library store its writer reads and writes. */
interface LibraryRows {
  readonly icons: readonly SavedCustomIcon[];
}

/**
 * How `useCustomIconLibraryStore` reaches storage: every write and delete through one queue, each
 * write measured against what storage holds when its turn comes, and rows shown before their write
 * lands kept through any refresh made meanwhile.
 *
 * Filed apart from the store because it is a different job: the store decides what an add, a change,
 * a tick, a keep and a delete mean for the set and the library; this keeps storage, and the rows the
 * store shows from it, whole while several of those are in flight at once.
 */
export function customIconLibraryWriter(
  get: () => LibraryRows,
  set: (change: (state: LibraryRows) => LibraryRows) => void,
) {
  /** Every library write and delete, one at a time — see {@link store}. */
  const queue = createSerialQueue();
  /** Rows shown before their write has landed, by row id, so a refresh from storage keeps them. */
  const pending = new Map<string, SavedCustomIcon>();

  /** What storage lists, with every write still in flight shown over it. */
  function withPending(listed: readonly SavedCustomIcon[]): SavedCustomIcon[] {
    return firstOfEachSlot([...pending.values(), ...listed.filter((row) => !pending.has(row.id))]);
  }

  async function refresh(): Promise<void> {
    const database = await getDatabase();
    const listed = await database.listCustomIcons();
    set(() => ({ icons: withPending(listed) }));
  }

  /**
   * Write `entry` into `projectId`'s library, over the row whose slot was `replacing` (or the entry's
   * own) where one is there, so an edit keeps its library row. Refused where no project has loaded to
   * file it under, which leaves the reader the same notice as a refused write.
   *
   * **Writes run one at a time, and each is measured against what storage holds** as its turn comes:
   * a write the store's own list let through, because an earlier one had not landed, is refused there
   * rather than storing a second row under one slot of a project.
   *
   * **`shownAtOnce` shows the row before the write lands** and withdraws it if the write is refused —
   * for an icon the set has just taken, whose row would otherwise read for a moment as one the library
   * does not hold. A change to a library icon the set does not hold is shown only once stored, so an
   * open form keeps its entry, and its draft, until the write has an answer. A row shown early survives
   * any refresh made meanwhile (`pending`).
   */
  async function store(
    projectId: string,
    entry: CustomIconEntry,
    replacing: string | null,
    shownAtOnce: boolean,
  ): Promise<void> {
    if (projectId === '') throw new Error('No project has loaded to file the icon under');
    const slot = replacing ?? entry.id;
    const held = get().icons.find((icon) => icon.projectId === projectId && icon.entry.id === slot);
    const icon: SavedCustomIcon = { id: held?.id ?? `custom-icon-${crypto.randomUUID()}`, projectId, entry };
    if (shownAtOnce) {
      pending.set(icon.id, icon);
      set((state) => ({ icons: [icon, ...state.icons.filter((each) => each.id !== icon.id)] }));
    }
    try {
      await queue(async () => {
        const database = await getDatabase();
        const others = (await database.listCustomIcons())
          .filter((row) => row.projectId === projectId && row.id !== icon.id)
          .map((row) => row.entry);
        const [refusal] = checkCustomIcon(customIconDraftOf(entry), [], null, others).refusals;
        if (refusal !== undefined) throw new Error(refusal.message);
        await database.saveCustomIcon(icon);
      });
    } catch (error) {
      pending.delete(icon.id);
      if (shownAtOnce) {
        set((state) => ({
          icons:
            held === undefined
              ? state.icons.filter((each) => each.id !== icon.id)
              : state.icons.map((each) => (each.id === icon.id ? held : each)),
        }));
      }
      throw error;
    }
    pending.delete(icon.id);
    await refresh();
  }

  /** Delete one row, in its turn, and stop showing it. */
  async function remove(id: string): Promise<void> {
    await queue(async () => {
      const database = await getDatabase();
      await database.deleteCustomIcon(id);
    });
    set((state) => ({ icons: state.icons.filter((held) => held.id !== id) }));
  }

  return { store, refresh, remove };
}
