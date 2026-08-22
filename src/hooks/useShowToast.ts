import { createContext, useCallback, useContext } from 'react';
import { useUIStore } from '../stores/useUIStore.ts';
import type { ToastTarget } from '../types/ui.ts';

/**
 * Which document the subtree below is rendered into, for anything in it that raises a notification.
 *
 * Context rather than a prop, because the question it answers is about the *surface* and not about
 * any one control. `DetachedPreview` portals the whole comparison panel into a window of its own,
 * so every control in that panel — the download button today, whatever the toolbar gains next —
 * has to address its confirmation there without being handed anything. A prop drilled from
 * `ImageComparison` would cover the button that reported the bug and miss the next one.
 *
 * The default is the page, which is where every other surface in the app is.
 */
export const ToastSurface = createContext<ToastTarget>('page');

/**
 * Raise a notification on the surface the caller is rendered in.
 *
 * This is what a React component uses in place of reading `showToast` off the store: the store's
 * action takes a destination and this is what knows which one, so the two together mean a control
 * cannot report its result into a document nobody is looking at. Code outside React — the preset and
 * history stores — calls `useUIStore.getState().showToast(...)` still, and gets the page by default,
 * which is the only surface it can be running for.
 */
export function useShowToast(): (message: string) => void {
  const surface = useContext(ToastSurface);
  const showToast = useUIStore((state) => state.showToast);

  return useCallback(
    (message: string) => {
      showToast(message, surface);
    },
    [showToast, surface],
  );
}
