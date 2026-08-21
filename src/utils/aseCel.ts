import { aseChunk } from './aseChunk.ts';
import { ByteWriter } from './byteWriter.ts';
import { deflate } from './deflate.ts';
import type { SheetFrame } from './sheetLayout.ts';

/**
 * One frame's pixels: the rectangle of the sheet it was cut from, compressed, and told where to sit.
 *
 * **Cel type 2 — a compressed image.** The specification defines a raw form as well and calls it
 * unused, which is what it should be: the payload is a zlib stream in exactly the raw layout, so the
 * only difference is the size of the file. `deflate.ts` produces that stream through the browser's
 * own `CompressionStream('deflate')`, which is RFC 1950 zlib rather than the bare RFC 1951 form —
 * the same property a PNG `IDAT` depends on, already established and already tested there.
 *
 * **A cel is only as large as its sprite.** The frames come from `sheetLayout.ts`, which cuts them
 * from the sprite bounds the segmentation found, so a cel carries the sprite and not the empty
 * canvas around it — which is both what the format is for and what keeps a sheet of small sprites
 * from being written as a stack of full-canvas images.
 *
 * Pure, as everything in this directory is. It is asynchronous only because the platform's
 * compressor is.
 */

/** Cel chunk (0x2005). */
const CEL_CHUNK = 0x2005;

/** Cel type 2: the pixels, in raw layout, compressed with zlib. */
const COMPRESSED_IMAGE = 2;

/** The one layer this writer emits, which every cel therefore belongs to. */
const ONLY_LAYER = 0;

/** A cel drawn as it is, at the layer's own place in the stack. */
const FULLY_OPAQUE = 255;
const DEFAULT_Z_ORDER = 0;

/** What one frame is cut from: the sheet's pixels, its width, and how wide one pixel is in bytes. */
export interface CelSource {
  /** The whole sheet — palette indices at one byte each, or RGBA at four. */
  readonly pixels: Uint8Array | Uint8ClampedArray;
  readonly sheetWidth: number;
  /** `1` for an indexed sheet, `4` for an RGBA one. */
  readonly bytesPerPixel: number;
}

export async function aseCelChunk(source: CelSource, frame: SheetFrame): Promise<Uint8Array<ArrayBuffer>> {
  const compressed = await deflate(crop(source, frame));
  return aseChunk(
    CEL_CHUNK,
    new ByteWriter(compressed.length + 20)
      .u16(ONLY_LAYER)
      .i16(frame.x)
      .i16(frame.y)
      .u8(FULLY_OPAQUE)
      .u16(COMPRESSED_IMAGE)
      .i16(DEFAULT_Z_ORDER)
      .zeros(5)
      .u16(frame.width)
      .u16(frame.height)
      .bytes(compressed)
      .toBytes(),
  );
}

/**
 * The frame's rectangle of the sheet, row by row from the top, each row left to right.
 *
 * Copied a row at a time rather than a pixel at a time: a row of a cel is a contiguous run of the
 * sheet whatever the pixel width is, so the whole crop is `height` calls to `set` rather than
 * `width × height` reads. At the 16.8 million pixels this app admits, and once per frame, that
 * distinction is the difference between a download and a pause.
 */
function crop(source: CelSource, frame: SheetFrame): Uint8Array<ArrayBuffer> {
  const { pixels, sheetWidth, bytesPerPixel } = source;
  const rowBytes = frame.width * bytesPerPixel;
  const out = new Uint8Array(rowBytes * frame.height);

  for (let row = 0; row < frame.height; row += 1) {
    const at = ((frame.top + row) * sheetWidth + frame.left) * bytesPerPixel;
    out.set(pixels.subarray(at, at + rowBytes), row * rowBytes);
  }

  return out;
}
