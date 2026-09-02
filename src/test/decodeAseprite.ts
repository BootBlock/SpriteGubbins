import type { Rgba } from '../types/quantiser.ts';
import {
  type DecodedCel,
  type DecodedLayer,
  type DecodedTag,
  readCel,
  readLayer,
  readPalette,
  readTags,
} from './asepriteChunks.ts';

/**
 * An `.aseprite` *reader*, for the tests of the `.aseprite` writer.
 *
 * Deliberately an independent implementation rather than the writer's own steps run backwards, for
 * the reason `decodePng.ts` gives: a round trip through shared code proves only that the code agrees
 * with itself, and what these tests need to establish is that the bytes are an Aseprite document. It
 * walks the header, the frame headers and the chunk stream exactly as the published format
 * specification describes them, and inflates each cel through the platform's `DecompressionStream`.
 *
 * **It checks the framing as it goes**, and that is most of its value: a chunk whose stated size does
 * not reach the next chunk, a frame whose stated size does not reach the next frame, and a file
 * whose stated size is not its length are all silent in a viewer that trusts one field and ignores
 * the others, and all three are how a hand-rolled writer goes wrong. Each throws here.
 *
 * In `src/test/` rather than `src/utils/` because nothing the app ships reads one of these files.
 */

/** One frame: how long it is held, which chunks it carried, and the cels among them. */
export interface DecodedFrame {
  readonly durationMs: number;
  /** Every chunk type in the frame, in order — so a test can say what a frame carried. */
  readonly chunkTypes: readonly number[];
  readonly cels: readonly DecodedCel[];
}

/** What a decoded document turned out to hold. */
export interface DecodedAseprite {
  /** The file's own stated size, which this reader has already checked against its length. */
  readonly fileSize: number;
  readonly width: number;
  readonly height: number;
  /** Bits per pixel: 8 indexed, 32 RGBA. */
  readonly depth: number;
  readonly colors: number;
  readonly transparentIndex: number;
  /** The deprecated whole-sprite speed field. */
  readonly speedMs: number;
  readonly frames: readonly DecodedFrame[];
  /** The palette chunk's entries, or `null` where the file carries no palette chunk. */
  readonly palette: readonly Rgba[] | null;
  /** The layers in the order their chunks appeared. */
  readonly layers: readonly DecodedLayer[];
  readonly tags: readonly DecodedTag[];
  /** How many user data chunks followed the tags chunk, which is where a tag's colour lives. */
  readonly tagUserData: number;
}

const FILE_MAGIC = 0xa5e0;
const FRAME_MAGIC = 0xf1fa;
const HEADER_BYTES = 128;
const FRAME_HEADER_BYTES = 16;

const LAYER_CHUNK = 0x2004;
const CEL_CHUNK = 0x2005;
const TAGS_CHUNK = 0x2018;
const PALETTE_CHUNK = 0x2019;
const USER_DATA_CHUNK = 0x2020;

export async function decodeAseprite(bytes: Uint8Array<ArrayBuffer>): Promise<DecodedAseprite> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint16(4, true) !== FILE_MAGIC) throw new Error('not an Aseprite file');

  const fileSize = view.getUint32(0, true);
  if (fileSize !== bytes.length) {
    throw new Error(`the file states ${String(fileSize)} bytes and is ${String(bytes.length)}`);
  }

  const frameCount = view.getUint16(6, true);
  const depth = view.getUint16(12, true);
  const bytesPerPixel = depth / 8;

  const frames: DecodedFrame[] = [];
  let palette: Rgba[] | null = null;
  const layers: DecodedLayer[] = [];
  let tags: DecodedTag[] = [];
  let tagUserData = 0;
  let at = HEADER_BYTES;

  for (let frame = 0; frame < frameCount; frame += 1) {
    const frameBytes = view.getUint32(at, true);
    if (view.getUint16(at + 4, true) !== FRAME_MAGIC) throw new Error(`frame ${String(frame)} has no magic`);
    if (at + frameBytes > bytes.length) throw new Error(`frame ${String(frame)} runs past the file`);

    const durationMs = view.getUint16(at + 8, true);
    const oldChunks = view.getUint16(at + 6, true);
    const newChunks = view.getUint32(at + 12, true);
    const chunkCount = newChunks === 0 ? oldChunks : newChunks;

    const chunkTypes: number[] = [];
    const cels: DecodedCel[] = [];
    let chunkAt = at + FRAME_HEADER_BYTES;

    for (let chunk = 0; chunk < chunkCount; chunk += 1) {
      const size = view.getUint32(chunkAt, true);
      const type = view.getUint16(chunkAt + 4, true);
      if (size < 6 || chunkAt + size > at + frameBytes) {
        throw new Error(`chunk ${String(chunk)} of frame ${String(frame)} does not fit its frame`);
      }
      const data = bytes.subarray(chunkAt + 6, chunkAt + size);
      chunkTypes.push(type);

      if (type === PALETTE_CHUNK) palette = readPalette(data);
      if (type === LAYER_CHUNK) layers.push(readLayer(data));
      if (type === TAGS_CHUNK) tags = readTags(data);
      if (type === USER_DATA_CHUNK) tagUserData += 1;
      if (type === CEL_CHUNK) cels.push(await readCel(data, bytesPerPixel));

      chunkAt += size;
    }

    if (chunkAt !== at + frameBytes) {
      throw new Error(
        `frame ${String(frame)} states ${String(frameBytes)} bytes and its chunks fill another`,
      );
    }
    frames.push({ durationMs, chunkTypes, cels });
    at += frameBytes;
  }

  if (at !== bytes.length) throw new Error('the frames do not fill the file');

  return {
    fileSize,
    width: view.getUint16(8, true),
    height: view.getUint16(10, true),
    depth,
    colors: view.getUint16(32, true),
    transparentIndex: view.getUint8(28),
    speedMs: view.getUint16(18, true),
    frames,
    palette,
    layers,
    tags,
    tagUserData,
  };
}
