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
 * is a walk over millions of bytes and has a worker of its own; the widest palette a PNG can carry
 * is 256 colours, which comes to a 4,096 × 16 strip — under a fiftieth of the smallest sheet this
 * tab accepts. A thread for that would cost more to start than the work it was started for.
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
    return { format, bytes: written.bytes, entries };
  }

  const text = format === 'GPL' ? gplText(palette.name, palette.entries) : hexListText(palette.entries);
  return { format, bytes: new TextEncoder().encode(text), entries };
}
