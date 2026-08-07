import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOAST_DURATION_MS } from '../constants/ui.ts';
import { useUIStore } from './useUIStore.ts';

/**
 * The toast's auto-dismiss is the only timing behaviour in the app, and it lives in the store
 * rather than in the `Toast` component precisely so a *repeated* message restarts the clock. That
 * is the case worth pinning: a component effect keyed on the message would not re-run, so the
 * second confirmation would inherit whatever was left of the first one's timer.
 */

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

    vi.advanceTimersByTime(TOAST_DURATION_MS - 1);
    expect(useUIStore.getState().toastMessage).toBe('Prompt copied');

    vi.advanceTimersByTime(1);
    expect(useUIStore.getState().toastMessage).toBeNull();
  });

  it('restarts the clock when the same message is raised again', () => {
    useUIStore.getState().showToast('Prompt copied');
    vi.advanceTimersByTime(TOAST_DURATION_MS - 100);

    useUIStore.getState().showToast('Prompt copied');
    // Would already be gone if the second call had inherited the first call's timer.
    vi.advanceTimersByTime(TOAST_DURATION_MS - 100);
    expect(useUIStore.getState().toastMessage).toBe('Prompt copied');

    vi.advanceTimersByTime(100);
    expect(useUIStore.getState().toastMessage).toBeNull();
  });

  it('replaces the visible message rather than queueing', () => {
    useUIStore.getState().showToast('First');
    useUIStore.getState().showToast('Second');
    expect(useUIStore.getState().toastMessage).toBe('Second');

    vi.advanceTimersByTime(TOAST_DURATION_MS);
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
    vi.advanceTimersByTime(TOAST_DURATION_MS * 2);
    expect(useUIStore.getState().toastMessage).toBe('Raised without scheduling');
  });

  it('toggles each overlay independently', () => {
    useUIStore.getState().toggleAtlasModal();
    expect(useUIStore.getState().isAtlasModalOpen).toBe(true);
    expect(useUIStore.getState().isHistoryModalOpen).toBe(false);

    useUIStore.getState().toggleHistoryModal();
    useUIStore.getState().toggleAtlasModal();
    expect(useUIStore.getState().isAtlasModalOpen).toBe(false);
    expect(useUIStore.getState().isHistoryModalOpen).toBe(true);
  });
});
