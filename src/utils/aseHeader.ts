import { aseChunk } from './aseChunk.ts';
import { ByteWriter } from './byteWriter.ts';

/**
 * What an `.aseprite` file says about the sprite as a whole: the 128-byte header, and the colour
 * profile the pixels are to be read in.
 *
 * Both are written once per file and neither describes a frame, which is why they are together and
 * apart from the layer, cel and tag chunks. Every field traces to the published format
 * specification's Header section; nothing here is inferred from Aseprite's own source, which is
 * EULA-licensed and was not read.
 *
 * Pure, as everything in this directory is.
 */

/** The `WORD` that identifies the format, at offset 4 of every file. */
const FILE_MAGIC = 0xa5e0;

/** Header flag 1: the layer chunk's opacity byte is a real value rather than something to ignore. */
const LAYER_OPACITY_VALID = 1;

/** Colour profile chunk (0x2007), which is where a file says what its RGB values mean. */
const COLOR_PROFILE_CHUNK = 0x2007;

/** Colour profile type 1: plain sRGB, with no embedded ICC profile. */
const PROFILE_SRGB = 1;

/** Where the file's own byte count sits, which is only known once every chunk has been written. */
export const FILE_SIZE_OFFSET = 0;

/** The shape of the sprite a header states, before any of its pixels are written. */
export interface AseHeader {
  readonly frames: number;
  readonly width: number;
  readonly height: number;
  /** 8 for indexed, 32 for RGBA — the only two this writer produces. */
  readonly depth: number;
  /** How many palette entries the file carries, or `0` where it carries no palette at all. */
  readonly colors: number;
  /**
   * Which palette entry stands for transparency on a normal layer.
   *
   * Always `0`, because `indexImage` orders the palette by ascending alpha and so puts a keyed
   * sheet's transparent entry first. A sheet with **no** transparent entry gets a background layer
   * instead of a normal one, where the specification states this field does not apply — see
   * `aseLayer.ts`, which is where that decision is made and why.
   */
  readonly transparentIndex: number;
  /** The deprecated whole-sprite frame duration, kept in step with the per-frame field. */
  readonly durationMs: number;
}

/** The 128 bytes a file opens with, its own size left at zero for the assembly to stamp. */
export function aseHeader(header: AseHeader): Uint8Array<ArrayBuffer> {
  return (
    new ByteWriter(128)
      .u32(0)
      .u16(FILE_MAGIC)
      .u16(header.frames)
      .u16(header.width)
      .u16(header.height)
      .u16(header.depth)
      .u32(LAYER_OPACITY_VALID)
      // Deprecated in favour of the per-frame duration, and written anyway with the same figure: a
      // reader old enough to use it would otherwise play the file at whatever it defaults to.
      .u16(header.durationMs)
      .u32(0)
      .u32(0)
      .u8(header.transparentIndex)
      .zeros(3)
      .u16(header.colors)
      // A pixel ratio of 1:1, which is what a sprite sheet is. Zero in either field means the same
      // thing to a reader, but stating it leaves nothing to be inferred.
      .u8(1)
      .u8(1)
      // No grid: the app has no cell size to offer, and 16 × 16 — the editor's own default — would be
      // a claim about artwork this writer has not measured.
      .i16(0)
      .i16(0)
      .u16(0)
      .u16(0)
      .zeros(84)
      .toBytes()
  );
}

/**
 * The colour profile chunk, always sRGB.
 *
 * Written rather than left out, because the alternative is not "no opinion": a file with no profile
 * chunk is read as profile type 0, which the specification glosses as the old files' behaviour, and
 * a colour-managed pipeline is then free to reinterpret the numbers. Every colour this app writes
 * came out of a `<canvas>` as an sRGB byte triple, so saying sRGB is the one statement that keeps
 * the exported palette the palette the reader was shown.
 *
 * The fixed-gamma flag is off, so the gamma field is unused and is written as zero.
 */
export function aseColorProfileChunk(): Uint8Array<ArrayBuffer> {
  return aseChunk(COLOR_PROFILE_CHUNK, new ByteWriter(16).u16(PROFILE_SRGB).u16(0).u32(0).zeros(8).toBytes());
}
