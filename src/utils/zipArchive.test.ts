import { describe, expect, it } from 'vitest';
import { readZip } from '../test/readZip.ts';
import { crc32 } from './crc32.ts';
import { zipArchive } from './zipArchive.ts';

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);

describe('zipArchive', () => {
  it('writes entries a reader finds through the central directory', () => {
    const archive = zipArchive([
      { name: 'sheet.png', bytes: bytes('a picture') },
      { name: 'sprites/01-heads-south.png', bytes: bytes('a sprite') },
      { name: 'manifest.json', bytes: bytes('{}') },
    ]);

    expect(readZip(archive).map((entry) => entry.name)).toStrictEqual([
      'sheet.png',
      'sprites/01-heads-south.png',
      'manifest.json',
    ]);
  });

  it('hands every entry’s bytes back exactly', () => {
    const payload = Uint8Array.from({ length: 300 }, (_, index) => index % 256);
    const [entry] = readZip(zipArchive([{ name: 'blob.bin', bytes: payload }]));

    expect(entry?.bytes).toStrictEqual(payload);
  });

  it('states the CRC the format expects', () => {
    // The check value is what a reader verifies an entry against, so a wrong one is an archive every
    // tool reports as corrupt while the bytes inside it are perfectly good.
    const payload = bytes('123456789');
    const archive = zipArchive([{ name: 'check.txt', bytes: payload }]);
    const view = new DataView(archive.buffer);

    // Read at the local header's own CRC field, which is where a reader verifies the entry from.
    expect(view.getUint32(14, true)).toBe(crc32(payload));
    expect(crc32(payload)).toBe(0xcbf43926);
  });

  it('is byte-identical for identical input', () => {
    // No clock reaches this function — the timestamp is pinned — which is what lets a test state
    // what it writes rather than approximating around a field that moves.
    const entries = [{ name: 'one.txt', bytes: bytes('one') }];

    expect(zipArchive(entries)).toStrictEqual(zipArchive(entries));
  });

  it('writes an empty archive rather than refusing one', () => {
    // Reachable: a sheet with nothing separable on it produces no sprite entries, and the pack still
    // has a sheet and a manifest to hold. An end record alone is a valid, if pointless, archive.
    expect(readZip(zipArchive([]))).toStrictEqual([]);
  });

  it('refuses more entries than the format can list', () => {
    const many = Array.from({ length: 0x10000 }, (_, index) => ({
      name: `${String(index)}.txt`,
      bytes: new Uint8Array(0),
    }));

    expect(() => zipArchive(many)).toThrow(/more than the format can list/);
  });
});
