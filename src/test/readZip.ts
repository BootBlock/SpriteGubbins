/**
 * Reading a stored ZIP back, for the suites that check what `zipArchive` wrote.
 *
 * Test-only, and deliberately not the writer's own logic run backwards: it walks the **central
 * directory**, which is the structure a real reader opens an archive by, so an archive whose local
 * headers were right and whose directory was wrong would pass a symmetric round-trip and fail here.
 * That is the same reason `src/test/decodePng.ts` exists beside the PNG writer.
 *
 * Only what this app writes is handled: stored entries, no Zip64, no encryption. Anything else
 * throws rather than being read approximately.
 */

/** One entry as the archive's directory names it. */
export interface ReadZipEntry {
  readonly name: string;
  readonly bytes: Uint8Array;
}

const END_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const STORED = 0;

export function readZip(archive: Uint8Array): readonly ReadZipEntry[] {
  const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
  // The end record is last and fixed-length here, since this writer emits no archive comment.
  const end = archive.length - 22;
  if (end < 0 || view.getUint32(end, true) !== END_SIGNATURE) throw new Error('no end-of-directory record');

  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();
  const entries: ReadZipEntry[] = [];

  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(at, true) !== CENTRAL_SIGNATURE) throw new Error('not a central directory header');
    if (view.getUint16(at + 10, true) !== STORED) throw new Error('this reader only handles stored entries');

    const size = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const localAt = view.getUint32(at + 42, true);
    const name = decoder.decode(archive.subarray(at + 46, at + 46 + nameLength));

    if (view.getUint32(localAt, true) !== LOCAL_SIGNATURE) throw new Error(`no local header for ${name}`);
    // The payload starts past the local header's own name and extra fields, which the *local* header
    // states — reading them off the directory entry instead is the classic way to land mid-file.
    const dataAt = localAt + 30 + view.getUint16(localAt + 26, true) + view.getUint16(localAt + 28, true);
    entries.push({ name, bytes: archive.subarray(dataAt, dataAt + size) });

    at += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}
