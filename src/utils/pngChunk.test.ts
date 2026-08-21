import { describe, expect, it } from 'vitest';
import { concatBytes, crc32, PNG_SIGNATURE, pngChunk } from './pngChunk.ts';

describe('PNG_SIGNATURE', () => {
  it('is the eight bytes the spec opens every PNG with', () => {
    expect([...PNG_SIGNATURE]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });
});

describe('crc32', () => {
  // The published check value for the ASCII string "123456789" under the reflected 0xEDB88320
  // polynomial — the one figure that says the table is right rather than merely self-consistent.
  it('matches the standard check value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('is never negative, whatever the high bit does', () => {
    for (let byte = 0; byte < 256; byte += 1) {
      expect(crc32(Uint8Array.from([byte]))).toBeGreaterThanOrEqual(0);
    }
  });

  it('is empty-safe', () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
  });
});

describe('pngChunk', () => {
  it('frames a payload as length, type, data and the CRC of the last two', () => {
    const chunk = pngChunk('IEND', new Uint8Array(0));
    expect([...chunk]).toEqual([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
  });

  it('writes the length big-endian', () => {
    const chunk = pngChunk('IDAT', new Uint8Array(258));
    expect([...chunk.subarray(0, 4)]).toEqual([0, 0, 1, 2]);
    expect(chunk).toHaveLength(258 + 12);
  });

  it('checks the type bytes as well as the data', () => {
    const one = pngChunk('IDAT', Uint8Array.from([1]));
    const other = pngChunk('IDAY', Uint8Array.from([1]));
    expect([...one.subarray(-4)]).not.toEqual([...other.subarray(-4)]);
  });
});

describe('concatBytes', () => {
  it('joins parts end to end', () => {
    expect([...concatBytes([Uint8Array.from([1, 2]), new Uint8Array(0), Uint8Array.from([3])])]).toEqual([
      1, 2, 3,
    ]);
  });
});
