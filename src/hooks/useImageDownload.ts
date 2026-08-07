import { useCallback } from 'react';
import { useUIStore } from '../stores/useUIStore.ts';

/**
 * Offering a quantised image back as a PNG.
 *
 * Separate from {@link useDownload} rather than an extension of it, and the difference is real:
 * that hook builds a `Blob` from a **string**, and a PNG is binary. Widening its signature to
 * `string | Blob` would make its two existing callers pass a type neither of them uses, and the
 * encoding step here — `ImageData` through a canvas — has nothing to do with a text download.
 *
 * The anchor protocol below is the same in both, deliberately duplicated rather than extracted:
 * it is six lines of browser trivia, and `useDownload` carries the full explanation of each one.
 *
 * PNG, not JPEG or WebP. The result is flat colour regions with hard edges and, often, real
 * transparency — every one of which a lossy encoder would undo at the last step.
 */
export function useImageDownload(): (sourceName: string, image: ImageData) => void {
  const showToast = useUIStore((state) => state.showToast);

  return useCallback(
    (sourceName, image) => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d');
      if (context === null) {
        showToast('This browser would not provide a 2D canvas');
        return;
      }
      // `putImageData`, not `drawImage`: it writes the pixels verbatim, ignoring any smoothing or
      // transform the context might otherwise apply to a nearest-neighbour result.
      context.putImageData(image, 0, 0);

      const filename = quantisedName(sourceName);
      canvas.toBlob((blob) => {
        if (blob === null) {
          showToast(`Could not encode ${filename}`);
          return;
        }
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 0);
        showToast(`Downloaded ${filename}`);
      }, 'image/png');
    },
    [showToast],
  );
}

/**
 * `character-sheet.webp` → `character-sheet-quantised.png`.
 *
 * Named after the source so a batch of eight split sheets stays sorted beside its originals, and
 * suffixed so the download never silently replaces the file it came from. The extension is always
 * `.png` because that is what was encoded, whatever arrived.
 */
function quantisedName(sourceName: string): string {
  const stem = sourceName.replace(/\.[^./\\]+$/, '');
  return `${stem === '' ? 'sprite-sheet' : stem}-quantised.png`;
}
