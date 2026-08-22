import { crc32 } from './crc32.ts';

/**
 * The PNG container, as bytes: the signature every file opens with, and the frame every chunk of it
 * is wrapped in.
 *
 * Hand-rolled rather than taken from a dependency, and the reason is the app's own constraint rather
 * than a preference: this is an offline PWA with a deliberately small dependency list, and a PNG
 * writer is a length, a four-letter type, a payload and a CRC. The compression — the one part that
 * genuinely wants a library — is the browser's own `CompressionStream`, so what is left is this
 * file. UPNG.js (MIT) was read as the reference for the layout; none of it is vendored.
 *
 * Pure, as everything in this directory is: bytes in, bytes out, no canvas and no document.
 */

/** The eight bytes a PNG opens with — the spec's §5.2 signature, which is how a reader knows it. */
export const PNG_SIGNATURE: Uint8Array<ArrayBuffer> = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

/**
 * One chunk, framed: a big-endian length, the four type bytes, the payload, and the CRC of the two
 * of them together.
 *
 * `type` is four ASCII characters. Its case carries meaning to a decoder — a lowercase fifth bit
 * says a chunk is ancillary, and the whole set this app writes (`IHDR`, `PLTE`, `tRNS`, `IDAT`,
 * `IEND`) is spelled exactly as the spec spells it — so it is passed through verbatim rather than
 * normalised.
 */
export function pngChunk(type: string, data: Uint8Array): Uint8Array<ArrayBuffer> {
  const chunk = new Uint8Array(data.length + 12);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  for (let index = 0; index < 4; index += 1) {
    chunk[4 + index] = type.charCodeAt(index);
  }
  chunk.set(data, 8);
  view.setUint32(data.length + 8, crc32(chunk.subarray(4, data.length + 8)));
  return chunk;
}

/**
 * The signature and the chunks, end to end — the file.
 *
 * The return type names its own buffer, and every byte-producing function in this feature does the
 * same. `Uint8Array` alone is `Uint8Array<ArrayBufferLike>`, which a `Blob` and a `CompressionStream`
 * both refuse — they take an `ArrayBuffer`-backed view, because a `SharedArrayBuffer`-backed one
 * throws at runtime, and this app *is* cross-origin isolated so that type genuinely exists here. A
 * cast at each call site would assert the check away rather than answer it.
 */
export function concatBytes(parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}
