import { ByteWriter } from './byteWriter.ts';
import { crc32 } from './crc32.ts';

/**
 * A ZIP archive, stored: the one container that can leave this app carrying more than one file.
 *
 * **A sprite pack is many files and a download is one**, which is the whole reason this exists. The
 * app has no server and hands a file over through an anchor with a `download` attribute, so a
 * hundred cut-out sprites and their manifest either arrive as a hundred prompts a browser will
 * refuse partway through, or as one archive. ZIP is what every operating system opens without being
 * asked, which is what a game pipeline's first step actually needs.
 *
 * **Stored, never deflated, and that is a measurement rather than laziness.** Every entry in a pack
 * is either an already-deflated PNG or a short manifest, and running the whole archive through
 * `CompressionStream` a second time buys tens of bytes on the manifest and loses on every PNG —
 * deflate on incompressible input emits the data plus five bytes per 65,535-byte block. Storing also
 * keeps this function synchronous and pure, where the PNG writer had to be asynchronous for the
 * browser's compressor.
 *
 * **Written through `ByteWriter`**, which is the `.aseprite` writer's own buffer and is
 * little-endian throughout — which ZIP is too, so the one respect in which that class is not general
 * purpose is the respect this format agrees with it on. That also means no field here is placed by a
 * hand-counted offset: the local header's position is simply how many bytes had been written when it
 * started, which is the arithmetic a manual `DataView` per record gets wrong one field at a time.
 *
 * **The timestamp is fixed at 1980-01-01**, the earliest a DOS field can express. A pure function has
 * no clock, and pinning it makes the archive byte-identical for identical input — which is what lets
 * a test state what the writer produces rather than approximating around a moving field. Nothing
 * downstream reads it: an importer cares what the entries are called and what they hold.
 *
 * Pure, as everything in this directory is: names and bytes in, bytes out.
 */

/** One file in the archive: the name it takes, and the bytes it holds. */
export interface ZipEntry {
  /** A path relative to the archive root — `sprites/01-heads-south.png`. Forward slashes only. */
  readonly name: string;
  readonly bytes: Uint8Array;
}

/** Local file header, central directory header, and end of central directory. */
const LOCAL_SIGNATURE = 0x04034b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const END_SIGNATURE = 0x06054b50;

/** 2.0 — what a reader needs to open a stored entry with a UTF-8 name. */
const VERSION_NEEDED = 20;
/** Bit 11: the name is UTF-8 rather than the format's original code page. */
const UTF8_NAME_FLAG = 0x0800;
/** Method 0 — the bytes are the file. */
const STORED = 0;
/** 1980-01-01 00:00 in the format's own two 16-bit fields: year 0, month 1, day 1. */
const DOS_TIME = 0;
const DOS_DATE = 33;

/**
 * What this writer cannot express, and therefore refuses.
 *
 * There is no Zip64 record here, so the count and the offsets have to fit the fields the classic
 * end-of-central-directory holds. Neither is reachable from a sprite sheet — the tab admits 16.8
 * million pixels, and a sheet with 65,535 separable pieces is not a sprite sheet — so this is a
 * guard against a caller that has gone wrong rather than a limit a reader will meet.
 */
const MAX_ENTRIES = 0xffff;
const MAX_OFFSET = 0xffffffff;

/** One entry's place in the archive, kept while the files are written so the directory can state it. */
interface DirectoryRecord {
  readonly name: Uint8Array;
  readonly check: number;
  readonly size: number;
  readonly offset: number;
}

export function zipArchive(entries: readonly ZipEntry[]): Uint8Array<ArrayBuffer> {
  if (entries.length > MAX_ENTRIES) {
    throw new Error(`An archive of ${String(entries.length)} files is more than the format can list`);
  }

  const encoder = new TextEncoder();
  const archive = new ByteWriter();
  const directory: DirectoryRecord[] = [];

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const check = crc32(entry.bytes);
    const offset = archive.length;
    if (offset > MAX_OFFSET) throw new Error('The archive is larger than the format can address');

    archive
      .u32(LOCAL_SIGNATURE)
      .u16(VERSION_NEEDED)
      .u16(UTF8_NAME_FLAG)
      .u16(STORED)
      .u16(DOS_TIME)
      .u16(DOS_DATE)
      .u32(check)
      // Stored, so the compressed and uncompressed sizes are the same number twice.
      .u32(entry.bytes.length)
      .u32(entry.bytes.length)
      .u16(name.length)
      .u16(0) // No extra field.
      .bytes(name)
      .bytes(entry.bytes);

    directory.push({ name, check, size: entry.bytes.length, offset });
  }

  const directoryAt = archive.length;
  for (const record of directory) {
    archive
      .u32(CENTRAL_SIGNATURE)
      // The version that *made* the file as well as the version needed to read it; the same here.
      .u16(VERSION_NEEDED)
      .u16(VERSION_NEEDED)
      .u16(UTF8_NAME_FLAG)
      .u16(STORED)
      .u16(DOS_TIME)
      .u16(DOS_DATE)
      .u32(record.check)
      .u32(record.size)
      .u32(record.size)
      .u16(record.name.length)
      .u16(0) // No extra field, …
      .u16(0) // … no comment, …
      .u16(0) // … one disk, …
      .u16(0) // … no internal attributes, …
      .u32(0) // … and none of the external ones a filesystem would carry.
      .u32(record.offset)
      .bytes(record.name);
  }

  // Taken before the record that states it, since writing it moves the end.
  const directorySize = archive.length - directoryAt;
  return archive
    .u32(END_SIGNATURE)
    .u16(0) // This disk, …
    .u16(0) // … and the disk the directory starts on: one archive, one disk.
    .u16(entries.length)
    .u16(entries.length)
    .u32(directorySize)
    .u32(directoryAt)
    .u16(0) // No archive comment.
    .toBytes();
}
