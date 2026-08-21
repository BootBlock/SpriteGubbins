import type { WrittenPng } from '../types/sheetFormat.ts';
import { CHANNELS_PER_PIXEL } from './imageData.ts';
import { deflate } from './deflate.ts';
import { concatBytes, PNG_SIGNATURE, pngChunk } from './pngChunk.ts';
import { filterScanlines, PNG_FILTER_NONE, PNG_FILTERS } from './pngFilter.ts';
import { indexImage } from './pngPalette.ts';

/**
 * Writing a quantised sheet as a PNG — indexed where the sheet's colours fit a palette, truecolour
 * where they do not.
 *
 * **This is the one PNG path the app has.** It replaced `canvas.toBlob`, which could only ever write
 * truecolour: a sheet reduced to sixty-four colours came out as a 32-bit RGBA file that merely
 * happened to use sixty-four of them, so the palette this tab's whole pipeline exists to produce was
 * a claim in the interface and absent from the file. An indexed PNG states it in `PLTE`, which is
 * what a game pipeline reads — and what an engine importer, a tile editor or a palette-swap shader
 * needs in order to treat the colours as a palette at all.
 *
 * Colour type 3 is chosen automatically rather than offered as a control, because there is nothing
 * to choose: where the colours fit, indexed says strictly more about the sheet and is smaller, and
 * where they do not, it cannot be written. See `indexImage` for that boundary.
 *
 * Pure: an `ImageData` in and bytes out, with no canvas and no document anywhere in it — which is
 * also what makes it testable, since the previous path could only be checked by opening the file.
 *
 * The reference sheet at a grid of 6 and a budget of 64 comes to 13,149 bytes indexed. The same
 * pixels written truecolour are a 32,777-byte `IDAT`, so 32,834 bytes complete — two and a half
 * times the file, for a sheet whose sixty-four colours the format was not being told about.
 */

/** Colour type 3: each pixel an index into `PLTE`. */
const COLOR_TYPE_PALETTE = 3;
/** Colour type 6: each pixel four channels of its own. */
const COLOR_TYPE_RGBA = 6;
/** The only depth this writer uses — one byte per index, and one per channel. */
const BIT_DEPTH = 8;

export async function encodePng(image: ImageData): Promise<WrittenPng> {
  const indexed = indexImage(image);
  const header = ihdr(image, indexed === null ? COLOR_TYPE_RGBA : COLOR_TYPE_PALETTE);

  if (indexed === null) {
    // Every channel of a truecolour sheet is a *quantity*, so all five filters are worth trying —
    // a gradient across a row costs one byte a pixel under Sub and four under None.
    const filtered = filterScanlines({
      raw: new Uint8Array(image.data.buffer, image.data.byteOffset, image.data.byteLength),
      rowBytes: image.width * CHANNELS_PER_PIXEL,
      height: image.height,
      bytesPerPixel: CHANNELS_PER_PIXEL,
      candidates: PNG_FILTERS,
    });
    return { format: 'PNG', bytes: assemble([header, await idat(filtered)]), paletteEntries: null };
  }

  // Filter 0 alone, and this is measured rather than inherited from the spec's advice: a palette
  // index is a name, so the difference between two of them predicts nothing, and the four
  // difference filters cost four extra passes over the sheet to make the file *larger*. On the
  // reference sheet at a grid of 6 and a budget of 64, the `IDAT` is 12,888 bytes stored and 15,042
  // adaptively filtered — 16.7% worse for five times the filtering work.
  const filtered = filterScanlines({
    raw: indexed.indices,
    rowBytes: image.width,
    height: image.height,
    bytesPerPixel: 1,
    candidates: PNG_FILTER_NONE,
  });

  const plte = new Uint8Array(indexed.entries.length * 3);
  const trns = new Uint8Array(indexed.transparentEntries);
  indexed.entries.forEach((entry, at) => {
    plte[at * 3] = entry.r;
    plte[at * 3 + 1] = entry.g;
    plte[at * 3 + 2] = entry.b;
    if (at < indexed.transparentEntries) trns[at] = entry.a;
  });

  const chunks = [header, pngChunk('PLTE', plte)];
  // Omitted entirely where nothing is transparent: a PNG with no `tRNS` is opaque by definition.
  if (indexed.transparentEntries > 0) chunks.push(pngChunk('tRNS', trns));
  chunks.push(await idat(filtered));

  return { format: 'PNG', bytes: assemble(chunks), paletteEntries: indexed.entries.length };
}

/** The image's shape and how its pixels are stored — always non-interlaced, at depth 8. */
function ihdr(image: ImageData, colorType: number): Uint8Array<ArrayBuffer> {
  const data = new Uint8Array(13);
  const view = new DataView(data.buffer);
  view.setUint32(0, image.width);
  view.setUint32(4, image.height);
  data[8] = BIT_DEPTH;
  data[9] = colorType;
  // Compression 0 (deflate) and filter method 0 (the five adaptive filters) are the only values the
  // spec defines, so they can only be constants. Interlace has a second — Adam7 — and this writer
  // does not offer it: it exists to let a photograph appear progressively over a slow connection,
  // which is nothing a sprite sheet saved to disk is doing, and it costs a larger file.
  return pngChunk('IHDR', data);
}

/** The filtered scanlines, deflated, as one `IDAT`. */
async function idat(filtered: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  return pngChunk('IDAT', await deflate(filtered));
}

/** Signature, chunks, and the empty `IEND` every PNG closes with. */
function assemble(chunks: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  return concatBytes([PNG_SIGNATURE, ...chunks, pngChunk('IEND', new Uint8Array(0))]);
}
