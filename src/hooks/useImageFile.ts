import { useCallback } from 'react';
import { MAX_IMAGE_PIXELS } from '../constants/quantiser.ts';
import type { ImportedImage } from '../types/quantiser.ts';
import { useShowToast } from './useShowToast.ts';

/**
 * Turning a file the user chose or dropped into pixels.
 *
 * A hook rather than a utility because every line of it is impure — it decodes a `File`, draws into
 * a canvas and raises toasts — and `src/utils/` stays a pure function of its arguments so the
 * quantiser's maths and the identity palette can be tested without a DOM.
 *
 * **Nothing is uploaded.** The file is decoded in the tab and the pixels never leave it. Of the two
 * things this app reads from disk — the other being the preset JSON `usePresetStore` imports — this
 * is the one the no-network rule matters most for: an image the user is about to ship is exactly the
 * payload that must never go anywhere.
 *
 * Paste and the page-wide drop are deliberately **not** here — they are `useImagePaste` and
 * `useImageDrop`, which a caller adds where an image arriving anywhere is unambiguously meant for
 * it. A window listener bundled into this hook would fire on the studio's identity-lock control
 * while the user was somewhere else entirely on the page.
 */
export function useImageFile(
  onImport: (imported: ImportedImage) => void,
): (file: File | null | undefined) => void {
  const showToast = useShowToast();

  return useCallback(
    (file: File | null | undefined) => {
      // Nothing dropped, nothing pasted, or a picker dismissed. Not a failure, so not a toast.
      if (!file) return;
      void decodeImage(file).then((decoded) => {
        if (decoded.ok) onImport({ name: file.name, image: decoded.image });
        else showToast(decoded.reason);
      });
    },
    [onImport, showToast],
  );
}

/**
 * Why a decode did not produce an image, in the words the toast will use.
 *
 * A result rather than a thrown error: every one of these is an ordinary thing a user can do — drop
 * a PDF, paste a 40-megapixel render, hand a browser a sheet it cannot find the memory to read back
 * — and the caller has to say something specific about each. Nothing below reaches the caller as a
 * rejected promise, because a rejection it does not expect is a file that vanishes without a word.
 */
type Decoded =
  { readonly ok: true; readonly image: ImageData } | { readonly ok: false; readonly reason: string };

/**
 * `File` → `ImageBitmap` → `<canvas>` → `ImageData`.
 *
 * `createImageBitmap` does the decoding, so every format the browser can display arrives the same
 * way, including one pasted from another application. The canvas is a scratch surface that is never
 * inserted into the document — it exists only to be read back.
 */
async function decodeImage(file: File): Promise<Decoded> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { ok: false, reason: `Could not read ${file.name} as an image` };
  }

  try {
    // Checked from the bitmap rather than the file size, because it is the pixel count most of the
    // pipeline is linear in. Declining is the honest response to an image that would freeze the tab;
    // appearing to hang is not.
    if (bitmap.width * bitmap.height > MAX_IMAGE_PIXELS) {
      return {
        ok: false,
        reason: `${file.name} is ${String(bitmap.width)} × ${String(bitmap.height)} pixels — past this app’s limit of ${MAX_IMAGE_PIXELS.toLocaleString()}`,
      };
    }

    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    if (context === null) return { ok: false, reason: 'This browser would not provide a 2D canvas' };

    context.drawImage(bitmap, 0, 0);
    return { ok: true, image: context.getImageData(0, 0, canvas.width, canvas.height) };
  } catch {
    // The canvas is where a sheet this app has agreed to admit can still fail. `getImageData` on a
    // sheet near `MAX_IMAGE_PIXELS` asks for 67 MB in one allocation, and a canvas past the engine’s
    // own dimension limit throws before that. Both are the reader’s ordinary file being too big for
    // this browser, so both belong in the result the caller already knows how to say something about
    // — a rejected promise here is the silent drop this branch exists to stop.
    return {
      ok: false,
      reason: `Could not read ${file.name} back off a canvas — at ${String(bitmap.width)} × ${String(bitmap.height)} pixels it may be more than this browser can hold`,
    };
  } finally {
    // Releases the decoded pixels immediately rather than at the next collection — a large sheet is
    // tens of megabytes, and the `ImageData` read out of the canvas is the only copy still needed.
    bitmap.close();
  }
}
