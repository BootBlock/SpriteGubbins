import { create } from 'zustand';
import { TOAST_DURATION_MS, TOAST_EXIT_MS } from '../constants/ui.ts';
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
  /**
   * Whether the visible toast is on its way out.
   *
   * A toast's life has two phases and only the first is a dwell: it announces for
   * {@link TOAST_DURATION_MS}, then fades for {@link TOAST_EXIT_MS} with the message still mounted,
   * because a surface cannot animate away after it has been removed. `Toast` reads this to swap the
   * entrance animation for the exit and to make the card inert, which is what stops an invisible
   * notification intercepting clicks in the corner of the page.
   */
  readonly isToastLeaving: boolean;
  readonly isAtlasModalOpen: boolean;
  readonly isHistoryModalOpen: boolean;
  readonly isSplitModalOpen: boolean;
  readonly isSettingsModalOpen: boolean;
  /** The deferred `beforeinstallprompt` event, or `null` when the app can't offer an install. */
  readonly deferredPWAInstallPrompt: BeforeInstallPromptEvent | null;

  setActiveTab(tab: AppTab): void;
  /**
   * Open the app on `tab`, unless the user has already gone somewhere themselves.
   *
   * The settings carry a preferred opening view, and they arrive *after* the first render — reading
   * them means opening a database, which is a worker, a WebAssembly module and an OPFS pool. So the
   * app is always on the studio for a moment first, and this is what moves it.
   *
   * The guard is the whole point. Those few hundred milliseconds are enough for someone who knows
   * where they are going to press a tab, and a preference that arrived late and pulled them back
   * would be the app fighting the person using it. A stored view is a statement about how the app
   * should *open*, which stops being true the moment they navigate.
   */
  openInitialTab(tab: AppTab): void;
  /**
   * Show a message, replacing any current one. It announces for {@link TOAST_DURATION_MS}, then
   * fades for {@link TOAST_EXIT_MS} before clearing itself.
   */
  showToast(message: string): void;
  /**
   * Take the toast off the screen now, whichever phase it is in.
   *
   * This is the ✕, and it stays instant on purpose: a user who asks for a notification to go has
   * said everything they need to about it, and making them watch two and a half seconds of flair
   * first would be the animation getting in the way of the interaction it decorates. So the exit
   * belongs to the *timer* expiring and not to the button — the deliberate departure is the one that
   * is worth animating.
   *
   * In practice the button is only reachable during the dwell, because `Toast` makes the card inert
   * for the whole of the fade — verified in Edge, where a click on the ✕ mid-fade does nothing. That
   * is the intended trade and not an oversight: a surface that is already leaving has nothing left
   * to dismiss, and leaving it interactive is exactly what would make a transparent card swallow
   * clicks meant for the page under it. What still has to hold here is the cancellation — this
   * clears whichever of the two timers is outstanding, so a removal scheduled for the old toast can
   * never arrive during the next one.
   */
  dismissToast(): void;
  /** Open or close the atlas calculator. Closes whichever other overlay was open. */
  toggleAtlasModal(): void;
  /** Open or close the history drawer. Closes whichever other overlay was open. */
  toggleHistoryModal(): void;
  /** Open or close the sheet splitter. Closes whichever other overlay was open. */
  toggleSplitModal(): void;
  /** Open or close the settings dialog. Closes whichever other overlay was open. */
  toggleSettingsModal(): void;
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
  isSettingsModalOpen: false,
} as const;

/**
 * Whether the user has chosen a view themselves yet.
 *
 * Module-level and outside the store for the same reason the toast's timer is: it is not state any
 * component renders, and putting it in the store would invite a selector onto it. It exists solely
 * so {@link UIState.openInitialTab} can tell "the app is still where it started" from "the app is on
 * the studio because that is where they went", which the tab alone cannot say.
 */
let hasNavigated = false;

/**
 * Whichever of the toast's two timers is pending — the dwell, or the fade that follows it.
 *
 * One variable, because the phases are sequential: the dwell schedules the fade as it ends, so there
 * is never more than one outstanding and cancelling "the toast's timer" is unambiguous whichever
 * phase it is in.
 *
 * Module-level, and owned by the store rather than by the `Toast` component, for two reasons. A
 * second toast raised while the first is showing must restart the clock — a component effect keyed
 * on the message would not re-run for a *repeated* message, so the second confirmation would
 * inherit the remains of the first one's timer. And the toast has no timing behaviour of its own to
 * clean up, so nothing survives an unmount that would need tearing down.
 *
 * The exit is timed here rather than driven from the component's `animationend` for the same
 * reason: an `animationend` handler makes the message's lifetime depend on the surface being
 * mounted and on the engine actually running animations, so a toast raised while `Toast` was not
 * rendered would never clear at all.
 */
let toastTimer: ReturnType<typeof setTimeout> | undefined;

function cancelToastTimer(): void {
  if (toastTimer !== undefined) clearTimeout(toastTimer);
  toastTimer = undefined;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'studio',
  toastMessage: null,
  toastId: 0,
  isToastLeaving: false,
  ...ALL_OVERLAYS_CLOSED,
  deferredPWAInstallPrompt: null,

  setActiveTab: (activeTab) => {
    hasNavigated = true;
    set({ activeTab });
  },

  openInitialTab: (activeTab) => {
    if (hasNavigated) return;
    set({ activeTab });
  },

  showToast: (message) => {
    cancelToastTimer();
    set((state) => ({ toastMessage: message, toastId: state.toastId + 1, isToastLeaving: false }));

    // The dwell, then the fade. `isToastLeaving` goes up while the message is still mounted, which
    // is the only way the surface has something left to animate; the second timer is what finally
    // removes it, and its length is the exit animation's own.
    toastTimer = setTimeout(() => {
      set({ isToastLeaving: true });
      toastTimer = setTimeout(() => {
        toastTimer = undefined;
        set({ toastMessage: null, isToastLeaving: false });
      }, TOAST_EXIT_MS);
    }, TOAST_DURATION_MS);
  },

  dismissToast: () => {
    cancelToastTimer();
    set({ toastMessage: null, isToastLeaving: false });
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

  toggleSettingsModal: () => {
    set((state) => ({ ...ALL_OVERLAYS_CLOSED, isSettingsModalOpen: !state.isSettingsModalOpen }));
  },

  setInstallPrompt: (deferredPWAInstallPrompt) => {
    set({ deferredPWAInstallPrompt });
  },
}));

/**
 * Forget that the user has navigated, so `openInitialTab` will apply again.
 *
 * For tests, which need each case to start from a fresh load; the running app has exactly one, and
 * `hasNavigated` is a fact about the session that nothing in it should be able to un-say.
 */
export function resetNavigationForTests(): void {
  hasNavigated = false;
}
