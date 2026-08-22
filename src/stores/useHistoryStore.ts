import { create } from 'zustand';
import { HISTORY_LIMIT } from '../db/backend.ts';
import { getDatabase } from '../db/database.ts';
import type { NewPromptHistoryLog, PromptHistoryLog } from '../types/history.ts';
import { useOutputStore } from './useOutputStore.ts';
import { useSubjectStore } from './useSubjectStore.ts';
import { useUIStore } from './useUIStore.ts';

/**
 * The prompts the user has actually taken away, newest first.
 *
 * Persistence is the point of this store: the list here is a view of the `prompt_history` table,
 * so every action writes through the backend and only then updates the state. Setting the state
 * first would leave the drawer showing entries that are not in the database and will be gone
 * tomorrow — which is worse than a failed write the user was told about.
 */
export interface HistoryState {
  readonly historyLogs: readonly PromptHistoryLog[];
  readonly isLoading: boolean;

  /** Record a prompt, minting its id and timestamp. See {@link NewPromptHistoryLog}. */
  addLog(entry: NewPromptHistoryLog): Promise<void>;
  /** Load the table into the store. Called when the history drawer opens. */
  fetchHistory(): Promise<void>;
  /** Remove one entry, so a prompt copied by mistake does not have to cost the whole history. */
  deleteLog(id: string): Promise<void>;
  clearHistory(): Promise<void>;
  /**
   * The whole recorded history as JSON, for the caller to offer as a download.
   *
   * Export only, and no import: the table is keyed by generated UUIDs, so merging a foreign
   * history into it is a question about collisions that nothing in the workflow asks. This is
   * there because the history is the one collection the user cannot rebuild — it is capped at
   * {@link HISTORY_LIMIT}, and OPFS may be evicted under storage pressure without asking.
   *
   * Returns the text rather than performing the download, as `usePresetStore.exportPresetsJSON`
   * does and for the same reason: the anchor element is the DOM's job, and a string is something
   * a test can assert on.
   */
  exportHistoryJSON(): string;
  /**
   * Put a recorded entry's studio state back into the studio, close the drawer and show it.
   *
   * Reaches into the subject and output stores, as `usePresetStore.loadPreset` does and for the same
   * reason: restoring *is* writing all of them, and it goes through their own actions so each keeps
   * its own invariants.
   */
  restoreLog(log: PromptHistoryLog): void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  historyLogs: [],
  isLoading: false,

  addLog: async (entry) => {
    const log: PromptHistoryLog = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };

    try {
      const database = await getDatabase();
      await database.addHistoryLog(log);
      // Trimmed to the same limit the backends enforce, so the store cannot show an entry the
      // table has already dropped.
      //
      // The localStorage fallback can drop more than that: it evicts oldest-first when the quota
      // refuses the write, so at a full store this list keeps a tail of entries storage no longer
      // holds. That is bounded and self-correcting — the drawer calls `fetchHistory` when it opens,
      // which replaces the list with what was actually stored — and it errs towards showing an old
      // prompt rather than losing a new one, which is the way round to be wrong.
      set((state) => ({ historyLogs: [log, ...state.historyLogs].slice(0, HISTORY_LIMIT) }));
    } catch {
      useUIStore.getState().showToast('Could not save this prompt to history');
    }
  },

  fetchHistory: async () => {
    set({ isLoading: true });
    try {
      const database = await getDatabase();
      set({ historyLogs: await database.listHistoryLogs() });
    } catch {
      useUIStore.getState().showToast('Could not load prompt history');
    } finally {
      set({ isLoading: false });
    }
  },

  deleteLog: async (id) => {
    try {
      const database = await getDatabase();
      await database.deleteHistoryLog(id);
      // Filtered from the state the set call is handed, not from a `historyLogs` captured when
      // this action started: the drawer's other actions are asynchronous too, and closing over a
      // stale list would resurrect anything that landed while the delete was in flight.
      set((state) => ({ historyLogs: state.historyLogs.filter((log) => log.id !== id) }));
      useUIStore.getState().showToast('Deleted that prompt');
    } catch {
      useUIStore.getState().showToast('Could not delete that prompt');
    }
  },

  clearHistory: async () => {
    try {
      const database = await getDatabase();
      await database.clearHistoryLogs();
      set({ historyLogs: [] });
      useUIStore.getState().showToast('Cleared prompt history');
    } catch {
      useUIStore.getState().showToast('Could not clear prompt history');
    }
  },

  // Every entry, not the drawer's filtered view: the search box is a lens over the history, not a
  // selection within it, so exporting while a query is typed must not silently drop the rest.
  exportHistoryJSON: () => JSON.stringify(get().historyLogs, null, 2),

  restoreLog: (log) => {
    useSubjectStore.getState().setSubject(log.category, log.subject);
    useOutputStore.getState().setOutputConfig(log.output);
    const ui = useUIStore.getState();
    ui.toggleHistoryModal();
    ui.setActiveTab('studio');
    ui.showToast('Restored that prompt into the studio');
  },
}));
