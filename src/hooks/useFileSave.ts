import { useCallback } from 'react';
import { useShowToast } from './useShowToast.ts';

/**
 * Handing a file to the browser to save, and saying so.
 *
 * The app has no server, so an anchor with a `download` attribute pointed at an object URL is the
 * only way anything leaves it as a file. That is six lines of browser trivia with two non-obvious
 * rules in it, and **every download in the app needs all six** — so they are written once here
 * rather than once per caller. What differs between callers is what the `Blob` is made of, what
 * media type it carries and what the confirmation says, and all three of those are arguments.
 *
 * **That is a closed statement rather than a list, and deliberately so.** Nothing else under `src/`
 * calls `URL.createObjectURL` or sets a `download` attribute, so a new kind of file is a new caller
 * of this hook and cannot be a second copy of it — which is the fact a reader adding one needs, and
 * it stays true however many callers there are. This paragraph used to enumerate them instead, and
 * said "both of the app's downloads" while a third had been added the day after it was written.
 * A roster of who calls a shared helper is kept by hand, is read as exhaustive, and is wrong from
 * the next commit onwards. What each caller does with the three arguments is that caller's own
 * business, and each says so in its own docblock.
 *
 * See {@link useClipboard} for why the browser-effect helpers live in this directory rather than in
 * `src/utils/`.
 */
export function useFileSave(): (filename: string, file: Blob, confirmation: string) => void {
  const showToast = useShowToast();

  return useCallback(
    (filename, file, confirmation) => {
      const url = URL.createObjectURL(file);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      // Connected to the document before clicking: a detached anchor is enough in Chromium, but not
      // historically in Firefox, and an unstyled element appended and removed within one task is
      // never painted.
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      // Revoked on the next task, not immediately. The click only *starts* the download, and
      // releasing the blob in the same task can leave the browser fetching a URL that no longer
      // resolves. Not revoking at all would hold the whole file in memory for the session.
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 0);
      showToast(confirmation);
    },
    [showToast],
  );
}
