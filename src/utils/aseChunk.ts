import { ByteWriter } from './byteWriter.ts';
import { concatBytes } from './pngChunk.ts';

/**
 * The `.aseprite` container: the frame a chunk is wrapped in, and the frame a *frame* is wrapped in.
 *
 * The counterpart to `pngChunk.ts` for the other file this app writes, and deliberately not shared
 * with it — the two formats agree on nothing but the idea of a length-prefixed block. PNG's lengths
 * are big-endian, exclude their own four bytes and are followed by a CRC of the payload; Aseprite's
 * are little-endian, **include** the six bytes of the size and type fields, and carry no checksum at
 * all. A helper covering both would take three flags and answer neither question clearly.
 *
 * Hand-rolled for the reason the PNG writer is: this is an offline PWA with a deliberately small
 * dependency list, and the compression — the one part that genuinely wants a library — is the
 * browser's own `CompressionStream`. [miriti/ase](https://github.com/miriti/ase) (MIT) was read as a
 * reference implementation while writing this; none of it is vendored. Aseprite's own source is
 * EULA-licensed and was **not** consulted — everything here traces to the published format
 * specification, `docs/ase-file-specs.md` in the Aseprite repository.
 *
 * Pure, as everything in this directory is: bytes in, bytes out.
 */

/** The `WORD` a frame header opens with, which is how a reader knows it has found one. */
const FRAME_MAGIC = 0xf1fa;

/** What the size and type fields of a chunk cost, and which the size field counts itself. */
const CHUNK_OVERHEAD = 6;

/**
 * The old `WORD` chunk count, whose value says "read the `DWORD` instead".
 *
 * Both fields are written, and they say the same thing for every frame this app produces: the new
 * one is authoritative, but a reader that only knows the old one — the specification names that case
 * — would otherwise find zero chunks in a frame that has some.
 */
const CHUNKS_OVERFLOW = 0xffff;

/** One chunk: its total size, its type, and its payload. */
export function aseChunk(type: number, data: Uint8Array): Uint8Array<ArrayBuffer> {
  const writer = new ByteWriter(data.length + CHUNK_OVERHEAD);
  return writer
    .u32(data.length + CHUNK_OVERHEAD)
    .u16(type)
    .bytes(data)
    .toBytes();
}

/**
 * One frame: a 16-byte header stating its own byte count and how long it is held for, then chunks.
 *
 * The size is written last, over the placeholder, because it counts the header it sits in as well as
 * everything after it — see {@link ByteWriter.patchU32}, which exists for this and for the file
 * size.
 */
export function aseFrame(chunks: readonly Uint8Array[], durationMs: number): Uint8Array<ArrayBuffer> {
  const body = concatBytes(chunks);
  const writer = new ByteWriter(body.length + 16);
  writer
    .u32(0)
    .u16(FRAME_MAGIC)
    .u16(chunks.length > CHUNKS_OVERFLOW ? CHUNKS_OVERFLOW : chunks.length)
    .u16(durationMs)
    .zeros(2)
    .u32(chunks.length)
    .bytes(body);
  return writer.patchU32(0, writer.length).toBytes();
}
