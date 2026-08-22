import { describe, expect, it } from 'vitest';
import { crc32 } from './crc32.ts';

describe('crc32', () => {
  // The published check value for the ASCII string "123456789" under the reflected 0xEDB88320
  // polynomial — the one figure that says the table is right rather than merely self-consistent.
  it('matches the standard check value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  // Two single-byte values from the published table, which is what says the *table* is right rather
  // than only that the accumulator agrees with itself. `0x00` and `0xFF` are the two that exercise
  // the polynomial at both ends of the byte.
  it.each([
    [0x00, 0xd202ef8d],
    [0xff, 0xff000000],
  ])('matches the published CRC of the single byte %i', (byte, expected) => {
    expect(crc32(Uint8Array.from([byte]))).toBe(expected);
  });

  it('is empty-safe', () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
  });
});
