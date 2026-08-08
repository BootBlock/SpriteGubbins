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
  /**
   * How many toasts have been raised, ever.
   *
   * Not shown anywhere — it is the identity of the *current* toast, which the message alone cannot
   * supply. Copying the prompt twice raises the same text twice, and React would reconcile that as
   * the same element left untouched, so the countdown drawn across the toast would keep draining
   * from wherever the first one had got to while the store's timer had started again from zero.
   * Keying on this number remounts the surface for each toast, repeated wording included.
   */
  readonly toastId: number;
  readonly isAtlasModalOpen: boolean;
  readonly isHistoryModalOpen: boolean;
  readonly isSplitModalOpen: boolean;
  /** The deferred `beforeinstallprompt` event, or `null` when the app can't offer an install. */
  readonly deferredPWAInstallPrompt: BeforeInstallPromptEvent | null;

  setActiveTab(tab: AppTab): void;
  /** Show a message, replacing any current one, and dismiss it after {@link TOAST_DURATION_MS}. */
  showToast(message: string): void;
  dismissToast(): void;
  /** Open or close the atlas calculator. Closes whichever other overlay was open. */
  toggleAtlasModal(): void;
  /** Open or close the history drawer. Closes whichever other overlay was open. */
  toggleHistoryModal(): void;
  /** Open or close the sheet splitter. Closes whichever other overlay was open. */
  toggleSplitModal(): void;
  setInstallPrompt(prompt: BeforeInstallPromptEvent | null): void;
}

/**
 * Every overlay shut.
 *
 * Spread ahead of the one being toggled, so opening any of them closes the rest by construction —
 * adding a fourth overlay needs this object updated once rather than a line added to three toggles,
 * and the invariant below cannot be half-applied.
 */
const ALL_OVERLAYS_CLOSED = {
  isAtlasModalOpen: false,
  isHistoryModalOpen: false,
  isSplitModalOpen: false,
} as const;

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
  toastId: 0,
  ...ALL_OVERLAYS_CLOSED,
  deferredPWAInstallPrompt: null,

  setActiveTab: (activeTab) => {
    set({ activeTab });
  },

  showToast: (message) => {
    cancelDismiss();
    set((state) => ({ toastMessage: message, toastId: state.toastId + 1 }));
    dismissTimer = setTimeout(() => {
      dismissTimer = undefined;
      set({ toastMessage: null });
    }, TOAST_DURATION_MS);
  },

  dismissToast: () => {
    cancelDismiss();
    set({ toastMessage: null });
  },

  // Opening one overlay closes the others. Every one of them is a `<dialog showModal()>`, and
  // stacking two puts the second in front of the first with the first still open behind it — two
  // modal contexts at once, which is not a state any of them is written for.
  toggleAtlasModal: () => {
    set((state) => ({ ...ALL_OVERLAYS_CLOSED, isAtlasModalOpen: !state.isAtlasModalOpen }));
  },

  toggleHistoryModal: () => {
    set((state) => ({ ...ALL_OVERLAYS_CLOSED, isHistoryModalOpen: !state.isHistoryModalOpen }));
  },

  toggleSplitModal: () => {
    set((state) => ({ ...ALL_OVERLAYS_CLOSED, isSplitModalOpen: !state.isSplitModalOpen }));
  },

  setInstallPrompt: (deferredPWAInstallPrompt) => {
    set({ deferredPWAInstallPrompt });
  },
}));
