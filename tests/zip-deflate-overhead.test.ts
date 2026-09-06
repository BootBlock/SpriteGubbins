import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { deflate } from '../src/utils/deflate.ts';

/**
 * The two figures `zipArchive`'s docblock prices its decision with, re-derived from the compressor.
 *
 * That docblock argues a sprite pack is stored rather than deflated, and the argument rests on what
 * deflate costs on input that cannot compress. It used to price that at five bytes per 65,535-byte
 * block, which is the largest length a stored block's `LEN` field can express — the number the
 * *format* states, not the one the *compressor* chose. zlib emits blocks of 16,384, so the real
 * cost was four times the stated one. The error ran in the direction that strengthened the
 * decision, so nothing downstream was wrong and nothing was ever going to report it.
 *
 * A corrected constant would sit here exactly as the old one did, so the fix is this: the block
 * size and the megabyte figure are both read back out of `CompressionStream` on every run, and a
 * platform that blocks differently fails here naming the paragraph it moved. `src/utils/deflate.ts`
 * is what the app calls and what this calls, so the two cannot measure different compressors.
 *
 * **The figure is stable enough to assert exactly, and that is worth stating rather than assuming.**
 * 16,384 is zlib's `lit_bufsize`, `1 << (memLevel + 6)` at the default `memLevel` of 8 — a
 * compile-time constant, not a property of the platform or the compression level, and the Streams
 * API exposes no option that could reach it. What zlib actually emits is a run of 16,383-literal
 * stored blocks with the occasional 16,386 or 16,389 where its matcher found a three-byte match, so
 * the 16,384 model below is an approximation with room in it: turning 4,000,000 bytes from 245
 * blocks into 244 would need every block to average 16,393, which even a matcher finding every
 * eligible match in random data does not reach. The assertion therefore survives a different
 * match-finding strategy and fails only on a genuinely different `lit_bufsize`, which is the change
 * the docblock it guards is about.
 *
 * **Incompressible input is the whole point of the measurement**, and it has to be genuinely so: a
 * pack holds already-deflated PNGs, whose bytes a second pass cannot shorten. The noise below is
 * generated rather than drawn from a fixture, because four megabytes of it would be four megabytes
 * committed to hold a property any generator has — but it is generated from a *fixed seed*, so a
 * failure here is a change to the compressor and never a draw that happened to compress.
 */

/** What a stored block costs: a one-byte header, then `LEN` and `NLEN` as two bytes each. */
const BYTES_PER_STORED_BLOCK = 5;

/** The block size the docblock now names, and the one the format's ceiling would have implied. */
const STATED_BLOCK_SIZE = 16_384;
const FORMAT_CEILING_BLOCK_SIZE = 65_535;

/** The docblock's worked figure, and the input it is stated for. */
const STATED_MEGABYTE_OVERHEAD = 310;
const ONE_MEGABYTE = 1_000_000;

/**
 * Bytes no compressor can shorten, which is what every entry in a pack already is.
 *
 * A xorshift rather than `Math.random`: the same seed gives the same four megabytes on every run
 * and on every machine, so this suite cannot flake on a lucky draw. Its high bits are taken because
 * a linear generator's low ones carry short cycles, which is exactly the structure LZ77 would find.
 */
function incompressible(length: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(new ArrayBuffer(length));
  let state = 0x9e3779b9;

  for (let at = 0; at < length; at += 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    bytes[at] = (state >>> 24) & 0xff;
  }

  return bytes;
}

/**
 * What `deflate` adds beyond the zlib wrapper, on `length` bytes it cannot shorten.
 *
 * `deflate` asks for the zlib form, which is what a PNG `IDAT` is defined to hold, so its two-byte
 * header and four-byte Adler-32 trailer come off: the docblock prices the *blocks*, and a ZIP entry
 * would carry neither.
 */
const ZLIB_WRAPPER_BYTES = 6;

async function blockOverheadOf(length: number): Promise<number> {
  const written = await deflate(incompressible(length));
  return written.length - length - ZLIB_WRAPPER_BYTES;
}

describe('the deflate cost zipArchive prices storing against', () => {
  it('emits five bytes per 16,384-byte block, not per 65,535-byte one', async () => {
    // Two lengths, because one is satisfiable by arithmetic that happens to agree. At 200,000 the
    // two candidate block sizes predict 65 and 20; at 4,000,000 they predict 1,225 and 310. A
    // block size that is neither fails both.
    for (const length of [200_000, 4_000_000]) {
      const overhead = await blockOverheadOf(length);
      const stated = BYTES_PER_STORED_BLOCK * Math.ceil(length / STATED_BLOCK_SIZE);
      const ceiling = BYTES_PER_STORED_BLOCK * Math.ceil(length / FORMAT_CEILING_BLOCK_SIZE);

      expect(
        overhead,
        `On ${String(length)} incompressible bytes the compressor added ${String(overhead)}. ` +
          `${String(STATED_BLOCK_SIZE)}-byte blocks predict ${String(stated)} and the format's ` +
          `${String(FORMAT_CEILING_BLOCK_SIZE)}-byte ceiling predicts ${String(ceiling)}. ` +
          'Restate the block size in src/utils/zipArchive.ts, which names this figure.',
      ).toBe(stated);
    }
  });

  it('costs the megabyte the docblock states', async () => {
    const overhead = await blockOverheadOf(ONE_MEGABYTE);

    expect(
      overhead,
      `A megabyte of incompressible bytes came back ${String(overhead)} longer, where ` +
        `src/utils/zipArchive.ts says ${String(STATED_MEGABYTE_OVERHEAD)}.`,
    ).toBe(STATED_MEGABYTE_OVERHEAD);
  });

  it('is the figure the docblock actually writes down', () => {
    // The assertions above are worth nothing if the paragraph they were written for has been
    // reworded around a different number. This is the half that catches that: the two figures have
    // to be spelled in the file, in the forms prose uses.
    // As one line: a docblock is hard-wrapped and its ` * ` prefixes fall mid-sentence, so either
    // phrase can be split across two lines by a reflow that changed nothing.
    const docblock = readFileSync(resolve(process.cwd(), 'src/utils/zipArchive.ts'), 'utf8')
      .replace(/^\s*\*/gm, '')
      .replace(/\s+/g, ' ');

    expect(docblock, 'src/utils/zipArchive.ts no longer names the block size.').toContain(
      `${STATED_BLOCK_SIZE.toLocaleString('en-GB')} bytes`,
    );
    expect(docblock, 'src/utils/zipArchive.ts no longer names the megabyte figure.').toContain(
      `${STATED_MEGABYTE_OVERHEAD.toLocaleString('en-GB')} bytes longer`,
    );
  });
});
