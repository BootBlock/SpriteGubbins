import { createContext, useCallback, useContext } from 'react';
import { useUIStore } from '../stores/useUIStore.ts';
import type { ToastSource } from '../types/ui.ts';

/**
 * Which part of the app the subtree below belongs to, for anything in it that raises a notification.
 *
 * Context rather than a prop, because the question it answers is about the *panel* and not about any
 * one control. `ImageComparison` provides `'preview'` around the whole comparison panel, which is the
 * one subtree that can be portalled into a window of its own, so every control in it — the download
 * button today, whatever the toolbar gains next — is identified without being handed anything. A prop
 * drilled from `ImageComparison` would cover the button that reported the bug and miss the next one.
 *
 * It names the panel rather than the document the panel is in, because the document can change
 * between a press and its answer — see {@link ToastSource}. The store turns this into a document at
 * the moment the notification is raised.
 *
 * The default is the page, which is where everything else in the app is.
 */
export const ToastSourceContext = createContext<ToastSource>('page');

/**
 * Raise a notification from the part of the app the caller is rendered in.
 *
 * This is what a React component uses in place of reading `showToast` off the store: the store's
 * action takes a source and this is what knows which one. Code outside React — the stores that
 * report their own failures — calls `useUIStore.getState().showToast(...)` still, and gets the page
 * by default, which is the only part of the app it can be running for.
 */
export function useShowToast(): (message: string) => void {
  const from = useContext(ToastSourceContext);
  const showToast = useUIStore((state) => state.showToast);

  return useCallback(
    (message: string) => {
      showToast(message, from);
    },
    [showToast, from],
  );
}
