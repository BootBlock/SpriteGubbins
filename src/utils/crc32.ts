/**
 * CRC-32, the reflected `0xEDB88320` one — what a PNG chunk carries and what a ZIP entry carries.
 *
 * Its own file because two containers this app writes want the same check value over different
 * bytes: PNG's §5.5 runs it over a chunk's type and data, and a ZIP local header and central
 * directory both state it for an entry's uncompressed contents. `zlib` and `gzip` use the same
 * polynomial, which is why one implementation answers for all of them — a second copy in the ZIP
 * writer would be the same arithmetic twice, and the kind that fails silently rather than loudly.
 *
 * **The unsigned reads are what make this legible, not what make it correct.** JavaScript's bitwise
 * operators work on *signed* 32-bit integers, so `0xEDB88320 ^ x` comes back negative — and yet the
 * bits are right either way: `>>>` and `&` read the same two's-complement pattern, `Uint32Array`
 * coerces on store, and `DataView.setUint32` writes the same four bytes for a negative value as for
 * its unsigned twin. So the `>>> 0`s below buy no correctness at all. They are there because the
 * intermediate values are read — in a debugger, in a failing assertion, against a published table —
 * and a CRC that prints as `-873187034` is one nobody can check against anything.
 *
 * Pure, as everything in this directory is.
 */

/** The table, built once on first use. */
let crcTable: Uint32Array | null = null;

function crc32Table(): Uint32Array {
  if (crcTable !== null) return crcTable;
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? (0xedb88320 ^ (value >>> 1)) >>> 0 : value >>> 1;
    }
    table[index] = value;
  }
  crcTable = table;
  return table;
}

/** The CRC-32 of a run of bytes. */
export function crc32(bytes: Uint8Array): number {
  const table = crc32Table();
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = ((table[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
