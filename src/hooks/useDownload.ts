import { useCallback } from 'react';
import { useUIStore } from '../stores/useUIStore.ts';

/**
 * Offering a generated file as a download. See {@link useClipboard} for why the browser-effect
 * helpers live in this directory rather than in `src/utils/`.
 *
 * The app has no server, so a download is the only way anything leaves it as a file: the compiled
 * prompt as Markdown, and the preset pack as JSON.
 */
export function useDownload(): (filename: string, text: string, mimeType: string) => void {
  const showToast = useUIStore((state) => state.showToast);

  return useCallback(
    (filename, text, mimeType) => {
      const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
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
      // resolves. Not revoking at all would hold the whole prompt in memory for the session.
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 0);
      showToast(`Downloaded ${filename}`);
    },
    [showToast],
  );
}
