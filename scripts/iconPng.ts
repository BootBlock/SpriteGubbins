/**
 * The icon set's PNG and ICO writers.
 *
 * The PNG half is assembled from the app's own container seams — `crc32`, `pngChunk`,
 * `PNG_SIGNATURE`, `concatBytes` and `filterScanlines` — which is what the `.mjs`→`.ts` move made
 * possible. Those files are pure and browser-free, so a build script can call them, and `crc32.ts`
 * states the reason to: a second copy of that arithmetic is "the kind that fails silently rather
 * than loudly".
 *
 * `src/utils/encodePng.ts` is the one seam this deliberately does *not* reuse. It takes an
 * `ImageData`, which the build has no way to make, and it chooses colour type 3 wherever the
 * colours fit a palette — six always fit, so reusing it would silently change what the ICO carries.
 * The layer below it is what this shares; the writer on top is a different question.
 *
 * Two more deliberate departures, both about the two ends being different platforms. Compression is
 * `node:zlib`'s `deflateSync` at level 9 rather than `src/utils/deflate.ts`, which wraps the
 * browser's `CompressionStream` and cannot be asked for a level — the icon is written once, by a
 * maintainer, and the smaller file is the whole trade. And every scanline is stored under filter 0:
 * the artwork is flat colour, so the four difference filters would only cost passes over the image.
 *
 * The ICO container has no counterpart anywhere in the app, so it is written out here in full.
 */

import { deflateSync } from 'node:zlib';
import { concatBytes, PNG_SIGNATURE, pngChunk } from '../src/utils/pngChunk.ts';
import { filterScanlines, PNG_FILTER_NONE } from '../src/utils/pngFilter.ts';
import { CHANNELS_PER_PIXEL } from '../src/utils/imageData.ts';

/** Encode a square 8-bit RGBA buffer as a PNG. */
export function encodePng(rgba: Uint8Array, size: number): Uint8Array {
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, size);
  view.setUint32(4, size);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: truecolour with alpha
  // Bytes 10-12 — compression, filter method, interlace — are all 0, as allocated.

  const filtered = filterScanlines({
    raw: rgba,
    rowBytes: size * CHANNELS_PER_PIXEL,
    height: size,
    bytesPerPixel: CHANNELS_PER_PIXEL,
    candidates: PNG_FILTER_NONE,
  });

  return concatBytes([
    PNG_SIGNATURE,
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(filtered, { level: 9 })),
    pngChunk('IEND', new Uint8Array(0)),
  ]);
}

/** One entry of an ICO: the square it holds, and the PNG that holds it. */
export interface IcoImage {
  readonly size: number;
  readonly png: Uint8Array;
}

/**
 * Wrap PNGs in an ICO container. Every entry is stored PNG-compressed rather than as a BMP
 * DIB — the format has allowed that since Windows Vista, and every browser in the app's
 * baseline reads it, so there is no reason to hand-roll the legacy bitmap-plus-AND-mask form.
 */
export function encodeIco(images: readonly IcoImage[]): Uint8Array {
  const directory = new Uint8Array(6 + 16 * images.length);
  const view = new DataView(directory.buffer);
  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type: icon
  view.setUint16(4, images.length, true);

  let offset = directory.length;
  images.forEach(({ size, png }, index) => {
    const at = 6 + 16 * index;
    // A dimension of 256 is encoded as 0; nothing here is that large, but the rule is the format's.
    directory[at] = size >= 256 ? 0 : size;
    directory[at + 1] = size >= 256 ? 0 : size;
    view.setUint16(at + 4, 1, true); // colour planes
    view.setUint16(at + 6, 32, true); // bits per pixel
    view.setUint32(at + 8, png.length, true);
    view.setUint32(at + 12, offset, true);
    offset += png.length;
  });

  return concatBytes([directory, ...images.map(({ png }) => png)]);
}
