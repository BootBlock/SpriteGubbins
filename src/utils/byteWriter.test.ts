import { describe, expect, it } from 'vitest';
import { ByteWriter } from './byteWriter.ts';

/**
 * That each field is the width and the byte order the Aseprite format specification states.
 *
 * Every one of these is invisible when it is wrong: a `WORD` written big-endian is still two bytes,
 * so the file parses and the number is nonsense, and a length written before the thing it measures
 * shifts everything after it.
 */

describe('ByteWriter', () => {
  it('writes every field little-endian, at the width it was asked for', () => {
    const bytes = new ByteWriter().u8(0x12).u16(0x3456).u32(0x789abcde).i16(-2).toBytes();

    expect([...bytes]).toEqual([0x12, 0x56, 0x34, 0xde, 0xbc, 0x9a, 0x78, 0xfe, 0xff]);
  });

  it('counts a string in bytes rather than characters', () => {
    // The specification says the `WORD` is the number of bytes, and the two differ for every name
    // outside ASCII — so a length taken from `String.length` would truncate the name on read.
    const bytes = new ByteWriter().text('é').toBytes();

    expect([...bytes]).toEqual([2, 0, 0xc3, 0xa9]);
  });

  it('grows past its initial room without losing what it already held', () => {
    const writer = new ByteWriter(2);
    for (let index = 0; index < 300; index += 1) writer.u8(index % 256);

    const bytes = writer.toBytes();
    expect(bytes).toHaveLength(300);
    expect([bytes[0], bytes[255], bytes[299]]).toEqual([0, 255, 43]);
  });

  it('reports how much it holds, and hands back only that', () => {
    const writer = new ByteWriter(64).u32(1);

    expect(writer.length).toBe(4);
    expect(writer.toBytes()).toHaveLength(4);
  });

  it('overwrites a size once what it measures has been written', () => {
    // How a chunk states a length it cannot know in advance: leave room, write the body, come back.
    const writer = new ByteWriter().u32(0).u16(0xf1fa);
    writer.patchU32(0, writer.length);

    expect([...writer.toBytes()]).toEqual([6, 0, 0, 0, 0xfa, 0xf1]);
  });

  it('fills a reserved run with zeros, and leaves what follows it where it should be', () => {
    // The format has several `BYTE[n]` runs it asks to be set to zero, and every field after one of
    // them is placed by its length — so a run that advanced without writing would be both wrong and
    // silent on a fresh buffer, which is already zero.
    expect([...new ByteWriter(8).u8(0xff).zeros(3).u8(0xff).toBytes()]).toEqual([0xff, 0, 0, 0, 0xff]);
  });
});
