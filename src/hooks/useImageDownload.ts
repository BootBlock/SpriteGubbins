import { useCallback, useEffect, useRef, useState } from 'react';
import { useUIStore } from '../stores/useUIStore.ts';
import { encodeOffThread } from '../workers/pngSession.ts';
import { useFileSave } from './useFileSave.ts';

/**
 * Offering a quantised image back as a PNG.
 *
 * **The file is written by `encodePng`, not by a canvas.** `canvas.toBlob` can only produce
 * truecolour, so a sheet reduced to sixty-four colours arrived on disk as a 32-bit file that merely
 * happened to use sixty-four of them — the palette this tab's whole pipeline exists to produce was a
 * claim in the panel and absent from what the reader took away. What is downloaded now is a true
 * indexed PNG wherever the sheet's colours fit a palette, carrying that palette in the file where a
 * game pipeline reads it.
 *
 * **The encode runs on a thread of its own**, because the canvas encoder it replaced was
 * asynchronous and this one is a long synchronous walk over every byte — see `pngWorker.ts`. That is
 * also why {@link ImageDownload.saving} exists: the press now has a duration a reader can see, so it
 * has to be one the control can show, and a second press during it would write the same file twice.
 */

/** The press, and whether one is still being answered. */
export interface ImageDownload {
  readonly save: (sourceName: string, image: ImageData, scale: number) => void;
  readonly saving: boolean;
}

export function useImageDownload(): ImageDownload {
  const showToast = useUIStore((state) => state.showToast);
  const saveFile = useFileSave();
  const [saving, setSaving] = useState(false);
  // Whether this hook's component is still on screen. The quantise view unmounts on navigation, and
  // an encode outlives the trip: without this, the reply lands on a component that no longer exists.
  const onScreen = useRef(true);
  useEffect(() => {
    onScreen.current = true;
    return () => {
      onScreen.current = false;
    };
  }, []);

  const save = useCallback(
    (sourceName: string, image: ImageData, scale: number) => {
      if (saving) return;
      setSaving(true);
      const filename = quantisedName(sourceName, scale);

      encodeOffThread(image)
        .then((encoded) => {
          saveFile(
            filename,
            new Blob([encoded.bytes], { type: 'image/png' }),
            `Downloaded ${filename} — ${describeEncoding(encoded.paletteEntries)}`,
          );
        })
        .catch((error: unknown) => {
          // Named rather than swallowed: the two realistic causes — a browser that would not start
          // the thread, and memory on a magnified sheet — are nothing alike, and a reader who is
          // told which can act on it.
          showToast(`Could not write ${filename}: ${reason(error)}`);
        })
        .finally(() => {
          if (onScreen.current) setSaving(false);
        });
    },
    [saveFile, saving, showToast],
  );

  return { save, saving };
}

/** Whatever was thrown, as the clause a sentence can end with. */
function reason(error: unknown): string {
  const said = error instanceof Error ? error.message : String(error);
  return said === '' ? 'the encoder gave no reason' : said;
}

/**
 * What the file turned out to be, as a clause after its name.
 *
 * Reported because it is the one thing about the download a reader cannot see from the preview, and
 * because the two outcomes call for different things from them: an indexed file is the palette claim
 * honoured in the format itself, while a truecolour one says the sheet holds more colours than a
 * palette can name, which is a reason to reach for the colour budget.
 *
 * **"Entries", not "colours", and the word is doing real work.** A palette entry is what `PLTE`
 * holds, and transparency takes one of them; the count in the caption beside the preview is of
 * *drawn* colours and leaves transparency out. So a keyed sheet the panel calls 32 colours writes a
 * 33-entry palette, and calling both of them colours would put two numbers for one thing on one
 * screen. The truecolour clause quotes no figure at all for the same reason — any threshold stated
 * here would disagree with that caption on exactly the keyed sheets this tab is for. The guidance
 * behind the button is where the two are reconciled; a toast is not.
 */
function describeEncoding(paletteEntries: number | null): string {
  return paletteEntries === null
    ? 'more colours than a palette can hold, so it is written truecolour'
    : `indexed, ${String(paletteEntries)}-entry palette`;
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
