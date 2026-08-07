import { create } from 'zustand';
import { TOAST_DURATION_MS } from '../constants/ui.ts';
import type { BeforeInstallPromptEvent } from '../types/pwa.ts';
import type { AppTab } from '../types/ui.ts';

/**
 * The shell: which view is showing, what the toast says, which overlay is open, and whether the
 * browser has offered an install.
 *
 * Everything here is chrome. No domain state lives in this store, which is why the studio can be
 * re-rendered by a category change without the header caring, and vice versa.
 */
export interface UIState {
  readonly activeTab: AppTab;
  readonly toastMessage: string | null;
  readonly isAtlasModalOpen: boolean;
  readonly isHistoryModalOpen: boolean;
  /** The deferred `beforeinstallprompt` event, or `null` when the app can't offer an install. */
  readonly deferredPWAInstallPrompt: BeforeInstallPromptEvent | null;

  setActiveTab(tab: AppTab): void;
  /** Show a message, replacing any current one, and dismiss it after {@link TOAST_DURATION_MS}. */
  showToast(message: string): void;
  dismissToast(): void;
  /** Open or close the atlas calculator. Closes the history drawer if it was open. */
  toggleAtlasModal(): void;
  /** Open or close the history drawer. Closes the atlas calculator if it was open. */
  toggleHistoryModal(): void;
  setInstallPrompt(prompt: BeforeInstallPromptEvent | null): void;
}

/**
 * The pending auto-dismiss.
 *
 * Module-level, and owned by the store rather than by the `Toast` component, for two reasons. A
 * second toast raised while the first is showing must restart the clock — a component effect keyed
 * on the message would not re-run for a *repeated* message, so the second confirmation would
 * inherit the remains of the first one's timer. And the toast has no timing behaviour of its own to
 * clean up, so nothing survives an unmount that would need tearing down.
 */
let dismissTimer: ReturnType<typeof setTimeout> | undefined;

function cancelDismiss(): void {
  if (dismissTimer !== undefined) clearTimeout(dismissTimer);
  dismissTimer = undefined;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'studio',
  toastMessage: null,
  isAtlasModalOpen: false,
  isHistoryModalOpen: false,
  deferredPWAInstallPrompt: null,

  setActiveTab: (activeTab) => {
    set({ activeTab });
  },

  showToast: (message) => {
    cancelDismiss();
    set({ toastMessage: message });
    dismissTimer = setTimeout(() => {
      dismissTimer = undefined;
      set({ toastMessage: null });
    }, TOAST_DURATION_MS);
  },

  dismissToast: () => {
    cancelDismiss();
    set({ toastMessage: null });
  },

  // Opening one overlay closes the other. Both are `<dialog showModal()>`, and stacking two of them
  // puts the second in front of the first with the first still open behind it — two modal contexts
  // at once, which is not a state either of them is written for.
  toggleAtlasModal: () => {
    set((state) => ({ isAtlasModalOpen: !state.isAtlasModalOpen, isHistoryModalOpen: false }));
  },

  toggleHistoryModal: () => {
    set((state) => ({ isHistoryModalOpen: !state.isHistoryModalOpen, isAtlasModalOpen: false }));
  },

  setInstallPrompt: (deferredPWAInstallPrompt) => {
    set({ deferredPWAInstallPrompt });
  },
}));
