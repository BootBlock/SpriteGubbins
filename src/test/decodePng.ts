import { scanlineFilters, unfilterScanlines } from './pngScanlines.ts';

/**
 * A PNG *reader*, for the tests of the PNG writer.
 *
 * Deliberately an independent implementation rather than the encoder's own steps run backwards: a
 * round trip through shared code proves only that the code agrees with itself, and what these tests
 * need to establish is that the bytes are a PNG. It walks the chunk stream, reads `IHDR`, `PLTE` and
 * `tRNS` as a decoder would, inflates `IDAT` through the platform's `DecompressionStream`, and
 * reconstructs the scanlines through `unfilterScanlines`.
 *
 * In `src/test/` rather than `src/utils/` because nothing the app ships reads a PNG — the browser
 * decodes the sheets a reader drops in.
 */

/** What a decoded PNG turned out to hold, including the parts an `ImageData` cannot carry. */
export interface DecodedPng {
  readonly width: number;
  readonly height: number;
  readonly colorType: number;
  readonly bitDepth: number;
  readonly interlace: number;
  /** `PLTE` as `[r, g, b]` triples, or `null` where the file carries no palette chunk. */
  readonly palette: readonly (readonly number[])[] | null;
  /** `tRNS` alphas, or `null` where the file carries no such chunk. */
  readonly transparency: readonly number[] | null;
  /** The filter byte each scanline was written under. */
  readonly filters: readonly number[];
  /** RGBA, row-major — the pixels a viewer would paint, palette resolved. */
  readonly pixels: Uint8ClampedArray;
}

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

export async function decodePng(bytes: Uint8Array): Promise<DecodedPng> {
  if (SIGNATURE.some((byte, at) => bytes[at] !== byte)) throw new Error('not a PNG');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  let header: DataView | null = null;
  let palette: number[][] | null = null;
  let transparency: number[] | null = null;
  const idat: Uint8Array[] = [];
  let seenEnd = false;

  for (let at = 8; at < bytes.length;) {
    const length = view.getUint32(at);
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    const data = bytes.subarray(at + 8, at + 8 + length);
    if (view.getUint32(at + 8 + length) !== crc32(bytes.subarray(at + 4, at + 8 + length))) {
      throw new Error(`bad CRC on ${type}`);
    }
    if (type === 'IHDR') header = new DataView(data.buffer, data.byteOffset, data.byteLength);
    if (type === 'PLTE') {
      palette = [];
      for (let entry = 0; entry < length; entry += 3) {
        palette.push([data[entry] ?? 0, data[entry + 1] ?? 0, data[entry + 2] ?? 0]);
      }
    }
    if (type === 'tRNS') transparency = [...data];
    if (type === 'IDAT') idat.push(data.slice());
    if (type === 'IEND') seenEnd = true;
    at += length + 12;
  }
  if (header === null || !seenEnd) throw new Error('missing IHDR or IEND');

  const width = header.getUint32(0);
  const height = header.getUint32(4);
  const bitDepth = header.getUint8(8);
  const colorType = header.getUint8(9);
  const interlace = header.getUint8(12);
  // Depth 8 only, which is every file these tests read: the encoder writes nothing else, and the
  // reference sheet at the repository root is colour type 2.
  const bytesPerPixel = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType] ?? 4;

  const inflated = await inflate(concat(idat));
  const rowBytes = width * bytesPerPixel;
  const raw = unfilterScanlines(inflated, rowBytes, height, bytesPerPixel);
  const filters = scanlineFilters(inflated, rowBytes, height);

  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const at = pixel * bytesPerPixel;
    if (colorType === 3) {
      const index = raw[pixel] ?? 0;
      const entry = palette?.[index] ?? [0, 0, 0];
      pixels.set([entry[0] ?? 0, entry[1] ?? 0, entry[2] ?? 0, transparency?.[index] ?? 255], pixel * 4);
    } else if (colorType === 2) {
      pixels.set([raw[at] ?? 0, raw[at + 1] ?? 0, raw[at + 2] ?? 0, 255], pixel * 4);
    } else if (colorType === 0) {
      const grey = raw[at] ?? 0;
      pixels.set([grey, grey, grey, 255], pixel * 4);
    } else if (colorType === 4) {
      const grey = raw[at] ?? 0;
      pixels.set([grey, grey, grey, raw[at + 1] ?? 0], pixel * 4);
    } else {
      pixels.set(raw.subarray(at, at + 4), pixel * 4);
    }
  }

  return { width, height, colorType, bitDepth, interlace, palette, transparency, filters, pixels };
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

/** The decoder's own CRC, so a corrupt chunk fails here rather than being trusted. */
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) === 1 ? (0xedb88320 ^ (crc >>> 1)) >>> 0 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
