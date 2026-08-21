import { ASEPRITE_TAG_COLOR } from '../constants/aseprite.ts';
import { aseChunk } from './aseChunk.ts';
import { ByteWriter } from './byteWriter.ts';
import type { SheetStrip } from './sheetLayout.ts';

/**
 * The tags chunk, plus the user data each tag's colour has to travel in.
 *
 * One tag per strip of the sheet — see `sheetLayout.ts`, which is where a strip is worked out and
 * why frames are ordered so that each strip is a contiguous run. The format states a tag as a
 * `[from, to]` frame range, so a tag naming a scattered set of frames cannot be expressed at all;
 * the ordering is what makes these ranges exist.
 *
 * **The colour goes in a user data chunk, not in the tag.** The tags chunk carries an RGB triple
 * which the specification marks deprecated and kept only for Aseprite v1.2.x, and says the tag's
 * real colour is "the one in the user data field following the tags chunk" — one user data chunk per
 * tag, in the tags' own order. Both are written with the same triple, so the file says one thing
 * whichever field its reader believes. Without the user data a current reader has no colour to read
 * at all and falls back to whatever its own default is, which is a document that looks different
 * from the one this app thought it wrote.
 *
 * Pure, as everything in this directory is.
 */

/** Tags chunk (0x2018), and the user data chunk (0x2020) that follows one per tag. */
const TAGS_CHUNK = 0x2018;
const USER_DATA_CHUNK = 0x2020;

/** User data flag 2: this chunk carries a colour. It carries no text and no properties. */
const HAS_COLOR = 2;

/** Loop direction 0 — forward, which is the only reading of a strip the app has grounds for. */
const FORWARD = 0;

/** Repeat count 0: unspecified, which plays indefinitely in the editor and once on export. */
const UNSPECIFIED_REPEAT = 0;

/**
 * The tags chunk followed by one user data chunk per tag, in order.
 *
 * Returns the chunks rather than one blob because the frame that carries them counts them: a frame
 * header states how many chunks are in it, and three tags are four chunks, not one.
 */
export function aseTagChunks(strips: readonly SheetStrip[]): Uint8Array<ArrayBuffer>[] {
  const writer = new ByteWriter(strips.length * 24 + 10).u16(strips.length).zeros(8);

  for (const strip of strips) {
    writer
      .u16(strip.from)
      .u16(strip.to)
      .u8(FORWARD)
      .u16(UNSPECIFIED_REPEAT)
      .zeros(6)
      .u8(ASEPRITE_TAG_COLOR.r)
      .u8(ASEPRITE_TAG_COLOR.g)
      .u8(ASEPRITE_TAG_COLOR.b)
      // The "extra byte" the specification requires between the deprecated colour and the name.
      .u8(0)
      .text(strip.name);
  }

  return [aseChunk(TAGS_CHUNK, writer.toBytes()), ...strips.map(() => tagUserData())];
}

/** One tag's user data: its colour, and nothing else. */
function tagUserData(): Uint8Array<ArrayBuffer> {
  return aseChunk(
    USER_DATA_CHUNK,
    new ByteWriter(8)
      .u32(HAS_COLOR)
      .u8(ASEPRITE_TAG_COLOR.r)
      .u8(ASEPRITE_TAG_COLOR.g)
      .u8(ASEPRITE_TAG_COLOR.b)
      .u8(255)
      .toBytes(),
  );
}
