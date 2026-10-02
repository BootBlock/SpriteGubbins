import { create } from 'zustand';
import { TOAST_DURATION_MS, TOAST_EXIT_MS } from '../constants/ui.ts';
import type { AppUpdate } from '../types/appUpdate.ts';
import type { BeforeInstallPromptEvent } from '../types/pwa.ts';
import type { AppTab, ToastSource, ToastTarget } from '../types/ui.ts';

/**
 * The shell: which view is showing, what the toast says, which overlay is open, whether the browser
 * has offered an install, and whether a newer build of the app is waiting.
 *
 * Everything here is chrome. No domain state lives in this store, which is why the studio can be
 * re-rendered by a category change without the header caring, and vice versa.
 */
export interface UIState {
  readonly activeTab: AppTab;
  readonly toastMessage: string | null;
  /**
   * Which document the current message belongs in.
   *
   * A notification follows the part of the app that raised it, and the app can have two surfaces at
   * once: the quantiser portals its comparison panel — download button included — into a window of
   * its own, and a confirmation for that panel belongs wherever the panel is when the confirmation
   * arrives. {@link UIState.showToast} decides that as it writes this, and every `Toast` reads it and
   * renders only what is addressed to the document it is mounted in, which is the same shape
   * {@link ALL_OVERLAYS_CLOSED} uses to keep one overlay showing at a time: one piece of state
   * decides, rather than two surfaces each deciding for themselves and both being right.
   */
  readonly toastTarget: ToastTarget;
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
   * When the current message was raised, as `Date.now()`.
   *
   * The store's two timers run from this moment, and so does everything the toast *draws*: the
   * entrance, and the countdown along its lower edge. They stayed in step for as long as the surface
   * showing them stayed mounted, and that is not something the surface can promise. The page's toast
   * is mounted in one of two mutually exclusive places — inside the `<dialog>` while an overlay is
   * open, and in `AppOverlays` while none is — so opening or closing an overlay unmounts one and
   * mounts the other. (The detached preview's is a third mount and is not part of this: it is
   * addressed to another document and there is no overlay in it to cross.) React cannot move a
   * subtree between two parents, and a CSS animation belongs to the element it runs on, so a
   * two-second-old notification slid in again and its countdown started over while this store went
   * on removing it on the original schedule. It then vanished with the bar about a third drained,
   * which is the exact thing a countdown exists to prevent.
   *
   * The mount cannot be made to survive that. The top layer is the reason the toast is inside the
   * dialog at all, and it does not offer a way out: measured in Edge, a `popover='manual'` element
   * shown before `showModal()` paints *beneath* the dialog and is inert, and re-showing it while the
   * dialog is open leaves it beneath and inert; a `popover='auto'` one is closed outright. So the
   * boundary stays, and what crosses it is a number — `ToastCard` reads this once as it mounts and
   * anchors both animations to it, which is what makes a remount resume rather than restart.
   */
  readonly toastRaisedAt: number;
  /**
   * Whether the visible toast is on its way out.
   *
   * A toast's life has two phases and only the first is a dwell: it announces for
   * {@link TOAST_DURATION_MS}, then fades for {@link TOAST_EXIT_MS} with the message still mounted,
   * because a surface cannot animate away after it has been removed. `ToastCard` reads this to swap
   * the entrance animation for the exit and to make itself inert, which is what stops an invisible
   * notification intercepting clicks in the corner of the page.
   */
  readonly isToastLeaving: boolean;
  /**
   * Whether the quantiser's preview panel is in a window of its own, and so whether a `Toast` is
   * mounted there to show what is addressed to it.
   *
   * Written by `DetachedPreview` as it mounts and unmounts, and by nothing else, because that
   * component is both the window's `Toast` and the only place the panel can be while it is away from
   * the page. The window's own state stays in `ImageComparison`; this is the one fact about it that
   * {@link UIState.showToast} has to read at a moment no render is involved in.
   */
  readonly isPreviewDetached: boolean;
  readonly isAtlasModalOpen: boolean;
  readonly isHistoryModalOpen: boolean;
  readonly isSplitModalOpen: boolean;
  readonly isSettingsModalOpen: boolean;
  readonly isIconCatalogueModalOpen: boolean;
  /** The deferred `beforeinstallprompt` event, or `null` when the app can't offer an install. */
  readonly deferredPWAInstallPrompt: BeforeInstallPromptEvent | null;
  /** Where this tab stands against the newest build, written by `src/workers/registerAppUpdates.ts`. */
  readonly appUpdate: AppUpdate;

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
   *
   * `from` says which part of the app raised it, and defaults to the page. **The document it is shown
   * in is decided here, as it is raised**, and not by the caller: a message from the preview panel
   * goes to the detached window while {@link isPreviewDetached} says the panel is there, and to the
   * page otherwise. A download is answered by a worker seconds after the press, so the document the
   * panel was in at the press can have closed, or opened, by the time there is anything to say — and
   * a message addressed to a window that has gone is shown nowhere at all.
   *
   * React components take `from` from {@link useShowToast}, which reads it from where they are
   * rendered. The default is what the stores themselves rely on: four of them raise their own
   * failures from outside React entirely, and nothing but the page raises those.
   */
  showToast(message: string, from?: ToastSource): void;
  /**
   * Record whether the preview panel is in a window of its own. `DetachedPreview` calls this as it
   * mounts and as it unmounts.
   *
   * Leaving the window also brings a notification still showing there back into the page. The
   * window can go at any moment — the reader presses Return, closes it themselves, or navigates away
   * from the quantiser — and the message would otherwise stay addressed to a surface that no longer
   * exists, which is the same silence this addressing was added to stop.
   *
   * It re-raises rather than re-labelling, so the dwell starts again. That is deliberate on both
   * counts: the page's live region never announced this message, so it needs to be announced there
   * rather than appearing silently, and the countdown drawn across the card would otherwise show a
   * full bar over whatever was left of the old timer.
   *
   * A message already **leaving** is left alone. Its own timer removes it within
   * {@link TOAST_EXIT_MS}, and nothing is served by pulling a notification two thirds of the way off
   * one screen back onto another at full opacity.
   */
  setPreviewDetached(detached: boolean): void;
  /**
   * Take the toast off the screen now, whichever phase it is in.
   *
   * This is the ✕, and it stays instant on purpose: a user who asks for a notification to go has
   * said everything they need to about it, and making them watch two and a half seconds of flair
   * first would be the animation getting in the way of the interaction it decorates. So the exit
   * belongs to the *timer* expiring and not to the button — the deliberate departure is the one that
   * is worth animating.
   *
   * In practice the button is only reachable during the dwell, because `ToastCard` goes inert
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
  /** Open or close the icon catalogue. Closes whichever other overlay was open. */
  toggleIconCatalogueModal(): void;
  setInstallPrompt(prompt: BeforeInstallPromptEvent | null): void;
  setAppUpdate(update: AppUpdate): void;
}

/**
 * Every overlay shut.
 *
 * Spread ahead of the one being toggled, so opening any of them closes the rest by construction —
 * adding another overlay needs this object updated once rather than a line added to every toggle,
 * and the invariant below cannot be half-applied.
 */
const ALL_OVERLAYS_CLOSED = {
  isAtlasModalOpen: false,
  isHistoryModalOpen: false,
  isSplitModalOpen: false,
  isSettingsModalOpen: false,
  isIconCatalogueModalOpen: false,
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

export const useUIStore = create<UIState>((set, get) => ({
  activeTab: 'studio',
  toastMessage: null,
  toastTarget: 'page',
  toastId: 0,
  toastRaisedAt: 0,
  isToastLeaving: false,
  isPreviewDetached: false,
  ...ALL_OVERLAYS_CLOSED,
  deferredPWAInstallPrompt: null,
  appUpdate: 'current',

  setActiveTab: (activeTab) => {
    hasNavigated = true;
    set({ activeTab });
  },

  openInitialTab: (activeTab) => {
    if (hasNavigated) return;
    set({ activeTab });
  },

  showToast: (message, from = 'page') => {
    cancelToastTimer();
    set((state) => ({
      toastMessage: message,
      toastTarget: from === 'preview' && state.isPreviewDetached ? 'detached' : 'page',
      toastId: state.toastId + 1,
      toastRaisedAt: Date.now(),
      isToastLeaving: false,
    }));

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

  setPreviewDetached: (isPreviewDetached) => {
    set({ isPreviewDetached });
    if (isPreviewDetached) return;
    const { toastMessage, toastTarget, isToastLeaving, showToast } = get();
    if (toastTarget !== 'detached' || toastMessage === null || isToastLeaving) return;
    showToast(toastMessage);
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

  toggleIconCatalogueModal: () => {
    set((state) => ({ ...ALL_OVERLAYS_CLOSED, isIconCatalogueModalOpen: !state.isIconCatalogueModalOpen }));
  },

  setInstallPrompt: (deferredPWAInstallPrompt) => {
    set({ deferredPWAInstallPrompt });
  },

  setAppUpdate: (appUpdate) => {
    set({ appUpdate });
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
