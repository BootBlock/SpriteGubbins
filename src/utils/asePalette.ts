import type { Rgba } from '../types/quantiser.ts';
import { aseChunk } from './aseChunk.ts';
import { ByteWriter } from './byteWriter.ts';

/**
 * The palette an indexed `.aseprite` file carries, as the format's own chunk.
 *
 * The entries are `pngPalette.ts`'s, unchanged: one list of colours read off the finished result,
 * feeding both files the app writes. That is what stops the two exports from disagreeing about what
 * the sheet's palette is — a PNG whose `PLTE` and an Aseprite document whose palette chunk were
 * derived separately would differ the first time either derivation changed.
 *
 * **Only the new palette chunk (0x2019) is written.** The specification says outright that a reader
 * finding it should ignore the two older forms, and both of those carry three channels rather than
 * four — a keyed sheet's transparent entry could not be stated in either. Aseprite writes an old
 * chunk alongside for backward compatibility with versions this app has never claimed to support,
 * and this repository builds no compatibility surface it does not need.
 *
 * Pure, as everything in this directory is.
 */

/** Palette chunk (0x2019). */
const PALETTE_CHUNK = 0x2019;

/** Entry flag 1 is "has name", and none of these entries has one — the colours are the whole of it. */
const NO_ENTRY_FLAGS = 0;

/** The whole palette, stated as a change to every entry it holds. */
export function asePaletteChunk(entries: readonly Rgba[]): Uint8Array<ArrayBuffer> {
  const writer = new ByteWriter(entries.length * 6 + 20)
    .u32(entries.length)
    // The range this chunk changes, which for a file being written from nothing is all of it.
    .u32(0)
    .u32(entries.length - 1)
    .zeros(8);

  for (const entry of entries) {
    writer.u16(NO_ENTRY_FLAGS).u8(entry.r).u8(entry.g).u8(entry.b).u8(entry.a);
  }

  return aseChunk(PALETTE_CHUNK, writer.toBytes());
}
