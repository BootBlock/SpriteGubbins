import { useCallback } from 'react';
import { useUIStore } from '../stores/useUIStore.ts';
import { encodePng } from '../utils/encodePng.ts';
import { MAX_PALETTE_ENTRIES } from '../utils/pngPalette.ts';

/**
 * Offering a quantised image back as a PNG.
 *
 * Separate from {@link useDownload} rather than an extension of it, and the difference is real:
 * that hook builds a `Blob` from a **string**, and a PNG is binary. Widening its signature to
 * `string | Blob` would make its two existing callers pass a type neither of them uses, and the
 * encoding step here has nothing to do with a text download.
 *
 * The anchor protocol below is the same in both, deliberately duplicated rather than extracted:
 * it is six lines of browser trivia, and `useDownload` carries the full explanation of each one.
 *
 * **The file is written by `encodePng`, not by a canvas**, which is the whole of item 10 of the
 * quantiser roadmap: `canvas.toBlob` can only produce truecolour, so a sheet reduced to sixty-four
 * colours arrived on disk as a 32-bit file that merely happened to use sixty-four of them. What is
 * downloaded now is a true indexed PNG wherever the sheet's colours fit a palette, carrying that
 * palette in the file where a game pipeline reads it.
 */
export function useImageDownload(): (sourceName: string, image: ImageData, scale: number) => void {
  const showToast = useUIStore((state) => state.showToast);

  return useCallback(
    (sourceName, image, scale) => {
      const filename = quantisedName(sourceName, scale);
      void encodePng(image).then(
        (encoded) => {
          const url = URL.createObjectURL(new Blob([encoded.bytes as BlobPart], { type: 'image/png' }));
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = filename;
          document.body.append(anchor);
          anchor.click();
          anchor.remove();
          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 0);
          showToast(`Downloaded ${filename} — ${describeEncoding(encoded.paletteEntries)}`);
        },
        () => {
          showToast(`Could not encode ${filename}`);
        },
      );
    },
    [showToast],
  );
}

/**
 * What the file turned out to be, as a clause after its name.
 *
 * Reported because it is the one thing about the download a reader cannot see from the preview, and
 * because the two outcomes call for different things from them: an indexed file is the palette claim
 * honoured in the format itself, while a truecolour one says the sheet holds more colours than a
 * palette can name — which is a reason to reach for the colour budget, and the figure to judge that
 * against is already on the panel beside the preview.
 */
function describeEncoding(paletteEntries: number | null): string {
  return paletteEntries === null
    ? `more colours than the ${String(MAX_PALETTE_ENTRIES)} a palette can name, so it is written truecolour`
    : `indexed, ${String(paletteEntries)}-colour palette`;
}

/**
 * `character-sheet.webp` → `character-sheet-quantised.png`, or `…-quantised@4x.png` magnified.
 *
 * Named after the source so a batch of eight split sheets stays sorted beside its originals, and
 * suffixed so the download never silently replaces the file it came from. The extension is always
 * `.png` because that is what was encoded, whatever arrived. A magnified copy carries its factor in
 * the `@4x` form asset pipelines already read, so the 1× file and its magnifications sort together
 * and none of them overwrites another.
 */
function quantisedName(sourceName: string, scale: number): string {
  const stem = sourceName.replace(/\.[^./\\]+$/, '');
  const factor = scale === 1 ? '' : `@${String(scale)}x`;
  return `${stem === '' ? 'sprite-sheet' : stem}-quantised${factor}.png`;
}
