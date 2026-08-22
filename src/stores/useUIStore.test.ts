import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOAST_DURATION_MS, TOAST_EXIT_MS } from '../constants/ui.ts';
import { resetNavigationForTests, useUIStore } from './useUIStore.ts';

/**
 * The toast's auto-dismiss is the only timing behaviour in the app, and it lives in the store
 * rather than in the `Toast` component precisely so a *repeated* message restarts the clock. That
 * is the case worth pinning: a component effect keyed on the message would not re-run, so the
 * second confirmation would inherit whatever was left of the first one's timer.
 *
 * It is two phases, not one, and the second is what the fade needs: the message stays mounted for
 * {@link TOAST_EXIT_MS} past its dwell so there is a surface left to animate away.
 */

/** A toast's whole life, both phases — what anything asserting it has *gone* has to wait out. */
const TOAST_LIFETIME_MS = TOAST_DURATION_MS + TOAST_EXIT_MS;

beforeEach(() => {
  vi.useFakeTimers();
  useUIStore.getState().dismissToast();
  useUIStore.setState({ isAtlasModalOpen: false, isHistoryModalOpen: false });
});

afterEach(() => {
  // Cancels any dismissal still pending, so the store's module-level timer cannot leak into the
  // next test.
  useUIStore.getState().dismissToast();
  vi.useRealTimers();
});

describe('useUIStore', () => {
  it('shows a toast and dismisses it after the configured duration', () => {
    useUIStore.getState().showToast('Prompt copied');
    expect(useUIStore.getState().toastMessage).toBe('Prompt copied');

    vi.advanceTimersByTime(TOAST_LIFETIME_MS - 1);
    expect(useUIStore.getState().toastMessage).toBe('Prompt copied');

    vi.advanceTimersByTime(1);
    expect(useUIStore.getState().toastMessage).toBeNull();
  });

  it('holds the message on screen for the whole of its fade', () => {
    // The dwell ends and the exit begins, but the surface has to survive it: a toast unmounted at
    // `TOAST_DURATION_MS` has nothing left to animate, which is the bug the second phase exists to
    // prevent. `isToastLeaving` is what `Toast` swaps the animation on.
    useUIStore.getState().showToast('Prompt copied');

    vi.advanceTimersByTime(TOAST_DURATION_MS - 1);
    expect(useUIStore.getState().isToastLeaving).toBe(false);

    vi.advanceTimersByTime(1);
    expect(useUIStore.getState().isToastLeaving).toBe(true);
    expect(useUIStore.getState().toastMessage).toBe('Prompt copied');

    vi.advanceTimersByTime(TOAST_EXIT_MS);
    expect(useUIStore.getState().toastMessage).toBeNull();
    expect(useUIStore.getState().isToastLeaving).toBe(false);
  });

  it('restarts the clock when the same message is raised again', () => {
    useUIStore.getState().showToast('Prompt copied');
    vi.advanceTimersByTime(TOAST_DURATION_MS - 100);

    useUIStore.getState().showToast('Prompt copied');
    // Would already be gone if the second call had inherited the first call's timer.
    vi.advanceTimersByTime(TOAST_LIFETIME_MS - 100);
    expect(useUIStore.getState().toastMessage).toBe('Prompt copied');

    vi.advanceTimersByTime(100);
    expect(useUIStore.getState().toastMessage).toBeNull();
  });

  it('re-entering shows a toast that had already begun to leave', () => {
    // A second confirmation arriving mid-fade has to cancel the exit as well as the removal, or the
    // new message would appear already fading and vanish early with the old toast's remaining time.
    useUIStore.getState().showToast('First');
    vi.advanceTimersByTime(TOAST_DURATION_MS);
    expect(useUIStore.getState().isToastLeaving).toBe(true);

    useUIStore.getState().showToast('Second');
    expect(useUIStore.getState().isToastLeaving).toBe(false);

    vi.advanceTimersByTime(TOAST_LIFETIME_MS - 1);
    expect(useUIStore.getState().toastMessage).toBe('Second');
  });

  it('replaces the visible message rather than queueing', () => {
    useUIStore.getState().showToast('First');
    useUIStore.getState().showToast('Second');
    expect(useUIStore.getState().toastMessage).toBe('Second');

    vi.advanceTimersByTime(TOAST_LIFETIME_MS);
    expect(useUIStore.getState().toastMessage).toBeNull();
  });

  it('dismissing cancels the pending auto-dismiss', () => {
    useUIStore.getState().showToast('First');
    useUIStore.getState().dismissToast();
    expect(useUIStore.getState().toastMessage).toBeNull();

    // Set directly rather than through `showToast`, which cancels the pending timer itself and
    // would therefore mask a `dismissToast` that had failed to. A timer that survived the dismissal
    // fires during the advance below and clears this message.
    useUIStore.setState({ toastMessage: 'Raised without scheduling' });
    vi.advanceTimersByTime(TOAST_LIFETIME_MS * 2);
    expect(useUIStore.getState().toastMessage).toBe('Raised without scheduling');
  });

  it('dismissing mid-fade cancels the removal the fade had scheduled', () => {
    // `dismissToast` has two timers to cancel now, not one, and the second is the dangerous one: a
    // removal left pending from a toast that is already gone fires part-way through whatever is
    // raised next and takes it with it. (The ✕ itself is only reachable during the dwell — `Toast`
    // makes the card inert for the fade — but the cancellation has to hold from either phase.)
    useUIStore.getState().showToast('First');
    vi.advanceTimersByTime(TOAST_DURATION_MS);
    expect(useUIStore.getState().isToastLeaving).toBe(true);

    useUIStore.getState().dismissToast();
    expect(useUIStore.getState().toastMessage).toBeNull();
    expect(useUIStore.getState().isToastLeaving).toBe(false);

    useUIStore.setState({ toastMessage: 'Raised without scheduling' });
    vi.advanceTimersByTime(TOAST_LIFETIME_MS * 2);
    expect(useUIStore.getState().toastMessage).toBe('Raised without scheduling');
  });

  it('opens and closes an overlay', () => {
    useUIStore.getState().toggleAtlasModal();
    expect(useUIStore.getState().isAtlasModalOpen).toBe(true);

    useUIStore.getState().toggleAtlasModal();
    expect(useUIStore.getState().isAtlasModalOpen).toBe(false);
  });

  it('never leaves both overlays open at once', () => {
    // Two stacked modal dialogs would put one in front of the other with both still open, and each
    // is written as if it were the only one.
    useUIStore.getState().toggleAtlasModal();
    useUIStore.getState().toggleHistoryModal();

    expect(useUIStore.getState().isHistoryModalOpen).toBe(true);
    expect(useUIStore.getState().isAtlasModalOpen).toBe(false);

    useUIStore.getState().toggleAtlasModal();
    expect(useUIStore.getState().isAtlasModalOpen).toBe(true);
    expect(useUIStore.getState().isHistoryModalOpen).toBe(false);
  });

  it('addresses a toast to the page unless it is told otherwise', () => {
    useUIStore.getState().showToast('Prompt copied');
    expect(useUIStore.getState().toastTarget).toBe('page');

    useUIStore.getState().showToast('Downloaded sheet-quantised.png', 'detached');
    expect(useUIStore.getState().toastTarget).toBe('detached');
  });

  it('brings a notification back into the page when the surface showing it goes', () => {
    useUIStore.getState().showToast('Downloaded sheet-quantised.png', 'detached');

    vi.advanceTimersByTime(TOAST_DURATION_MS - 1);
    useUIStore.getState().recallToast();

    // Re-raised rather than re-labelled: the page's live region never announced this, and the dwell
    // it has left in the window it is leaving is not the dwell it needs where it is arriving.
    expect(useUIStore.getState().toastMessage).toBe('Downloaded sheet-quantised.png');
    expect(useUIStore.getState().toastTarget).toBe('page');
    vi.advanceTimersByTime(TOAST_DURATION_MS - 1);
    expect(useUIStore.getState().isToastLeaving).toBe(false);
  });

  it('leaves a notification already on its way out where it is', () => {
    useUIStore.getState().showToast('Downloaded sheet-quantised.png', 'detached');
    vi.advanceTimersByTime(TOAST_DURATION_MS);
    expect(useUIStore.getState().isToastLeaving).toBe(true);

    useUIStore.getState().recallToast();

    // Nothing is served by pulling a card two thirds of the way off one screen back onto another at
    // full opacity — its own timer takes it off within `TOAST_EXIT_MS`.
    expect(useUIStore.getState().toastTarget).toBe('detached');
    vi.advanceTimersByTime(TOAST_EXIT_MS);
    expect(useUIStore.getState().toastMessage).toBeNull();
  });

  it('leaves a toast the page raised alone', () => {
    useUIStore.getState().showToast('Saved custom preset');
    const raised = useUIStore.getState().toastId;

    useUIStore.getState().recallToast();

    // Not re-raised, which would restart the dwell of a notification nothing has happened to.
    expect(useUIStore.getState().toastId).toBe(raised);
    expect(useUIStore.getState().toastTarget).toBe('page');
  });

  it('shuts every other overlay when the settings dialog opens, and is shut by them', () => {
    // The fourth overlay, and the one that arrived after the invariant was written — which is
    // exactly the shape that gets half-applied. Both directions are checked: an overlay added to
    // `ALL_OVERLAYS_CLOSED` but toggled without spreading it closes the others while nothing closes
    // *it*, so the first assertion alone would pass on a store that still stacks two dialogs.
    useUIStore.getState().toggleAtlasModal();
    useUIStore.getState().toggleSettingsModal();

    expect(useUIStore.getState().isSettingsModalOpen).toBe(true);
    expect(useUIStore.getState().isAtlasModalOpen).toBe(false);

    useUIStore.getState().toggleHistoryModal();
    expect(useUIStore.getState().isSettingsModalOpen).toBe(false);
    expect(useUIStore.getState().isHistoryModalOpen).toBe(true);
  });
});

describe('the view the app opens on', () => {
  beforeEach(() => {
    // A fact about a session, and each of these is a fresh load.
    resetNavigationForTests();
    useUIStore.setState({ activeTab: 'studio' });
  });

  it('moves the app when the preference arrives after first paint', () => {
    // It always does arrive late: reading it means opening a worker, a WebAssembly module and an
    // OPFS pool, so the app is on the studio for a moment whatever the setting says.
    useUIStore.getState().openInitialTab('spec');
    expect(useUIStore.getState().activeTab).toBe('spec');
  });

  it('declines to move anyone who has already navigated', () => {
    useUIStore.getState().setActiveTab('presets');
    useUIStore.getState().openInitialTab('spec');

    expect(useUIStore.getState().activeTab).toBe('presets');
  });

  it('counts navigating back to the studio as navigating', () => {
    // The case the tab alone cannot answer, and the reason a flag exists rather than a comparison
    // against the default: someone who went to Quantise and came back is on `studio` for the same
    // reason a fresh load is, and only one of them should be moved.
    useUIStore.getState().setActiveTab('quantise');
    useUIStore.getState().setActiveTab('studio');
    useUIStore.getState().openInitialTab('spec');

    expect(useUIStore.getState().activeTab).toBe('studio');
  });
});
