import { useCallback } from 'react';
import { PALETTE_FILE_TYPES } from '../constants/paletteFiles.ts';
import type { PaletteFileFormat, SettledPalette } from '../types/paletteFile.ts';
import { paletteFileName } from '../utils/paletteFileName.ts';
import { writePalette } from '../utils/writePalette.ts';
import { useFileSave } from './useFileSave.ts';
import { useShowToast } from './useShowToast.ts';

/**
 * Handing a settled palette back as a file, in whichever of the three forms was asked for.
 *
 * The app settles an exact list of colours in three places — a machine palette pinned in the studio,
 * a palette locked across a series, and the colours a reduction arrived at — and until this existed
 * none of them could leave. A pipeline that needs the swatch as a texture had to have one painted by
 * hand, one colour at a time, which is exactly the step that puts a green nobody chose into every
 * piece of a character.
 *
 * **No worker and no busy state**, which is the whole difference from {@link useImageDownload}. That
 * one wraps a walk over millions of bytes that a reader can watch happen; the largest palette here
 * is a 4,096 × 16 strip, so the press has no duration worth showing and a second press during it
 * would be a second small file rather than the same large one written twice.
 *
 * See {@link useClipboard} for why the browser-effect helpers live in this directory rather than in
 * `src/utils/`.
 */
export function usePaletteDownload(): (palette: SettledPalette, format: PaletteFileFormat) => void {
  const saveFile = useFileSave();
  const showToast = useShowToast();

  return useCallback(
    (palette, format) => {
      const type = PALETTE_FILE_TYPES[format];
      const filename = paletteFileName(palette.name, type.extension);

      writePalette(palette, format)
        .then((written) => {
          saveFile(
            filename,
            new Blob([written.bytes], { type: type.mediaType }),
            `Downloaded ${filename} — ${String(written.entries)} ${written.entries === 1 ? 'colour' : 'colours'}`,
          );
        })
        .catch((error: unknown) => {
          // Named rather than swallowed, as the sheet download does it: the one realistic cause is
          // the platform compressor the PNG writer waits on, and a reader who is told that can try
          // one of the two text forms instead of concluding the palette is unwritable.
          showToast(`Could not write ${filename}: ${reason(error)}`);
        });
    },
    [saveFile, showToast],
  );
}

/** Whatever was thrown, as the clause a sentence can end with. */
function reason(error: unknown): string {
  const said = error instanceof Error ? error.message : String(error);
  return said === '' ? 'the writer gave no reason' : said;
}
