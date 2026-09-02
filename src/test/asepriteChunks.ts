import type { Rgba } from '../types/quantiser.ts';

/**
 * The chunk types an `.aseprite` document carries, and the reader for each one.
 *
 * The other half of `decodeAseprite.ts`, which walks the *container* — the file header, the frame
 * headers, the chunk stream and the three size fields it checks against one another. This is what
 * sits inside a chunk once that walk has found one and handed over its payload. Nothing here reads
 * an offset into the file or knows a chunk has a header: each function is given the bytes of one
 * chunk and returns what it states.
 *
 * Deliberately an independent implementation rather than the writer's own steps run backwards, for
 * the reason `decodePng.ts` gives, and in `src/test/` rather than `src/utils/` for the reason
 * `decodeAseprite.ts` gives: nothing the app ships reads one of these files.
 */

/** One cel: where it sits, how big it is, and its pixels as the file stores them. */
export interface DecodedCel {
  readonly layer: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Inflated: one byte per pixel indexed, four per pixel RGBA, row-major. */
  readonly pixels: Uint8Array;
}

/** One tag, as the tags chunk states it. */
export interface DecodedTag {
  readonly from: number;
  readonly to: number;
  readonly direction: number;
  readonly name: string;
}

/** One layer, as the layer chunk states it. */
export interface DecodedLayer {
  readonly flags: number;
  readonly type: number;
  readonly opacity: number;
  readonly name: string;
}

export function readPalette(data: Uint8Array): Rgba[] {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const first = view.getUint32(4, true);
  const last = view.getUint32(8, true);
  const entries: Rgba[] = [];

  let at = 20;
  for (let index = first; index <= last; index += 1) {
    const flags = view.getUint16(at, true);
    if (flags !== 0) throw new Error('this reader does not expect named palette entries');
    entries.push({
      r: view.getUint8(at + 2),
      g: view.getUint8(at + 3),
      b: view.getUint8(at + 4),
      a: view.getUint8(at + 5),
    });
    at += 6;
  }

  if (at !== data.length) throw new Error('the palette chunk holds more than the entries it declared');
  return entries;
}

export function readLayer(data: Uint8Array): DecodedLayer {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    flags: view.getUint16(0, true),
    type: view.getUint16(2, true),
    opacity: view.getUint8(12),
    name: readText(data, 16),
  };
}

export function readTags(data: Uint8Array): DecodedTag[] {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const count = view.getUint16(0, true);
  const tags: DecodedTag[] = [];

  let at = 10;
  for (let tag = 0; tag < count; tag += 1) {
    const name = readText(data, at + 17);
    tags.push({
      from: view.getUint16(at, true),
      to: view.getUint16(at + 2, true),
      direction: view.getUint8(at + 4),
      name,
    });
    at += 17 + 2 + new TextEncoder().encode(name).length;
  }

  if (at !== data.length) throw new Error('the tags chunk holds more than the tags it declared');
  return tags;
}

export async function readCel(data: Uint8Array<ArrayBuffer>, bytesPerPixel: number): Promise<DecodedCel> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const type = view.getUint16(7, true);
  if (type !== 2) throw new Error(`this reader only expects compressed cels, and found type ${String(type)}`);

  const width = view.getUint16(16, true);
  const height = view.getUint16(18, true);
  const pixels = await inflate(data.subarray(20));
  if (pixels.length !== width * height * bytesPerPixel) {
    throw new Error(`a ${String(width)} × ${String(height)} cel inflated to ${String(pixels.length)} bytes`);
  }

  return {
    layer: view.getUint16(0, true),
    x: view.getInt16(2, true),
    y: view.getInt16(4, true),
    width,
    height,
    pixels,
  };
}

/** A `STRING`: a `WORD` byte length, then that many UTF-8 bytes. */
export function readText(data: Uint8Array, at: number): string {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const length = view.getUint16(at, true);
  return new TextDecoder().decode(data.subarray(at + 2, at + 2 + length));
}

/**
 * The platform's own zlib, which is the other end of what `deflate.ts` writes.
 *
 * The argument names its own buffer, as every byte-producing signature in this feature does: a
 * `SharedArrayBuffer`-backed view is refused by `CompressionStream` and its opposite at runtime, and
 * this app *is* cross-origin isolated, so that type genuinely exists here.
 */
async function inflate(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const source = new ReadableStream<BufferSource>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  return new Uint8Array(
    await new Response(source.pipeThrough(new DecompressionStream('deflate'))).arrayBuffer(),
  );
}
