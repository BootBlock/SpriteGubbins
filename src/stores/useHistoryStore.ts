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
  clearHistory(): Promise<void>;
  /**
   * Put a recorded entry's studio state back into the studio, close the drawer and show it.
   *
   * Reaches into the subject and output stores, as `usePresetStore.loadPreset` does and for the same
   * reason: restoring *is* writing all of them, and it goes through their own actions so each keeps
   * its own invariants.
   */
  restoreLog(log: PromptHistoryLog): void;
}

export const useHistoryStore = create<HistoryState>((set) => ({
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

  restoreLog: (log) => {
    useSubjectStore.getState().setSubject(log.category, log.subject);
    useOutputStore.getState().setOutputConfig(log.output);
    const ui = useUIStore.getState();
    ui.toggleHistoryModal();
    ui.setActiveTab('studio');
    ui.showToast('Restored that prompt into the studio');
  },
}));
