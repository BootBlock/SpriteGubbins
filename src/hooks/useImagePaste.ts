import { useEffect } from 'react';

/**
 * Accepting an image pasted anywhere on the page.
 *
 * Registered on the window rather than on a drop zone: a paste has no drop target, and asking the
 * user to focus a region first would make the quickest way in the fussiest. The listener lives
 * exactly as long as the component that added it, and its removal is the cleanup below.
 *
 * **Separate from `useImageFile` because it is not always wanted.** A window listener claims every
 * paste on the page, which is right for the Quantise tab — a whole surface whose only input is an
 * image — and wrong for one control among a form's many, where the user pasting a screenshot has no
 * reason to expect a field to change.
 *
 * `useImageDrop` is the same claim for the other gesture, and it is deliberately a second hook: a
 * drop has to answer for itself while the file is still in the air, so it reports whether one is
 * over the window and cancels the browser's own navigation, neither of which a paste has any use
 * for.
 *
 * @param acceptFile must be stable — it is a dependency of the listener, so a fresh function every
 * render would tear the listener down and re-register it every render.
 */
export function useImagePaste(acceptFile: (file: File | null | undefined) => void): void {
  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      acceptFile(event.clipboardData?.files.item(0));
    }
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [acceptFile]);
}
