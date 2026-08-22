import { concatBytes } from './pngChunk.ts';
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

export function zipArchive(entries: readonly ZipEntry[]): Uint8Array<ArrayBuffer> {
  if (entries.length > MAX_ENTRIES) {
    throw new Error(`An archive of ${String(entries.length)} files is more than the format can list`);
  }

  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const check = crc32(entry.bytes);

    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, LOCAL_SIGNATURE, true);
    localView.setUint16(4, VERSION_NEEDED, true);
    localView.setUint16(6, UTF8_NAME_FLAG, true);
    localView.setUint16(8, STORED, true);
    localView.setUint16(10, DOS_TIME, true);
    localView.setUint16(12, DOS_DATE, true);
    localView.setUint32(14, check, true);
    localView.setUint32(18, entry.bytes.length, true);
    localView.setUint32(22, entry.bytes.length, true);
    localView.setUint16(26, name.length, true);
    local.set(name, 30);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, CENTRAL_SIGNATURE, true);
    // The version that *made* the file as well as the version needed to read it; the same here.
    centralView.setUint16(4, VERSION_NEEDED, true);
    centralView.setUint16(6, VERSION_NEEDED, true);
    centralView.setUint16(8, UTF8_NAME_FLAG, true);
    centralView.setUint16(10, STORED, true);
    centralView.setUint16(12, DOS_TIME, true);
    centralView.setUint16(14, DOS_DATE, true);
    centralView.setUint32(16, check, true);
    centralView.setUint32(20, entry.bytes.length, true);
    centralView.setUint32(24, entry.bytes.length, true);
    centralView.setUint16(28, name.length, true);
    if (offset > MAX_OFFSET) throw new Error('The archive is larger than the format can address');
    centralView.setUint32(42, offset, true);
    central.set(name, 46);

    locals.push(local, entry.bytes);
    centrals.push(central);
    offset += local.length + entry.bytes.length;
  }

  const directorySize = centrals.reduce((total, central) => total + central.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, END_SIGNATURE, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, directorySize, true);
  endView.setUint32(16, offset, true);

  return concatBytes([...locals, ...centrals, end]);
}
