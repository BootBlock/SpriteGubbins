import { SWATCH_BLOCK_PIXELS } from '../constants/paletteFiles.ts';
import type { PaletteFileFormat, SettledPalette, WrittenPalette } from '../types/paletteFile.ts';
import { encodePng } from './encodePng.ts';
import { gplText, hexListText } from './paletteText.ts';
import { swatchImage } from './swatchImage.ts';

/**
 * One palette download, from the colours the reader settled to the bytes of the file that leaves the
 * app.
 *
 * **The decision of which writer answers a press lives here**, as `writeSheet`’s does, so the three
 * writers stay reachable from a plain unit test and no caller has to know which of them produces
 * bytes and which produces text.
 *
 * **It runs on the calling thread, and that is the whole difference from a sheet download.** A sheet
 * is a walk over millions of bytes and has a worker of its own. What crosses here is bounded
 * instead: the swatch is offered only up to `MAX_PALETTE_ENTRIES` colours, so the widest picture
 * this writes is 4,096 × 16 pixels, and the two text forms are a string per colour. A thread for
 * that would cost more to start than the work it was started for.
 *
 * **The bound is the caller’s, and it is not decorative.** `PaletteDownload` withholds the swatch
 * above that ceiling — see `PaletteFileType.maxEntries`. Nothing upstream caps a palette: the
 * `UNRESTRICTED` colour budget reduces nothing, so a result can carry ten thousand colours, and
 * drawing a block each would put a 160,000-pixel strip through this function on the reader’s own
 * thread.
 *
 * Pure, as everything in this directory is — asynchronous only because the PNG writer waits on the
 * platform’s compressor.
 */
export async function writePalette(
  palette: SettledPalette,
  format: PaletteFileFormat,
): Promise<WrittenPalette> {
  const entries = palette.entries.length;

  if (format === 'SWATCH_PNG') {
    const written = await encodePng(swatchImage(palette.entries, SWATCH_BLOCK_PIXELS));
    return { bytes: written.bytes, entries };
  }

  const text = format === 'GPL' ? gplText(palette.name, palette.entries) : hexListText(palette.entries);
  return { bytes: new TextEncoder().encode(text), entries };
}
