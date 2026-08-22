import { useCallback } from 'react';
import { useShowToast } from './useShowToast.ts';

/**
 * Copying text, and telling the user whether it worked.
 *
 * A hook rather than a plain function in `src/utils/` because it does two impure things — it talks
 * to the clipboard and it raises a toast — and everything in `src/utils/` is a pure function of its
 * arguments. That is the rule this directory exists to keep: the browser-effect helpers the
 * components share live here, so `src/utils/` stays testable without a DOM.
 *
 * The original application copied through a hidden `<textarea>` and `document.execCommand('copy')`.
 * That is the workaround for browsers without the async clipboard API; this app is served over
 * localhost or HTTPS and is cross-origin isolated, so `navigator.clipboard` is always present and
 * the deprecated path would only be dead code. A refusal is reported rather than retried.
 *
 * @returns a callback resolving to whether the text reached the clipboard, so a caller that has
 * further work to do (logging the prompt it just copied) can skip it when the copy failed.
 */
export function useClipboard(): (text: string, successMessage: string) => Promise<boolean> {
  const showToast = useShowToast();

  return useCallback(
    async (text, successMessage) => {
      try {
        await navigator.clipboard.writeText(text);
        showToast(successMessage);
        return true;
      } catch {
        // Reached when the document is not focused, permission is denied, or the API is absent —
        // all of which look the same to the user, and none of which the app can resolve for them.
        showToast('Could not copy to the clipboard');
        return false;
      }
    },
    [showToast],
  );
}
