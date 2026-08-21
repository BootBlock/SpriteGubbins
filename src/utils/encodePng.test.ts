import { describe, expect, it } from 'vitest';
import { decodePng } from '../test/decodePng.ts';
import { imageFrom } from '../test/images.ts';
import type { Rgba } from '../types/quantiser.ts';
import { encodePng } from './encodePng.ts';
import { MAX_PALETTE_ENTRIES } from './pngPalette.ts';

const CLEAR: Rgba = { r: 0, g: 0, b: 0, a: 0 };

/** A small sheet in four colours, one of them transparent — the shape this tab actually produces. */
function keyedSheet(): ImageData {
  const palette: Rgba[] = [
    CLEAR,
    { r: 20, g: 24, b: 40, a: 255 },
    { r: 120, g: 200, b: 90, a: 255 },
    { r: 200, g: 60, b: 70, a: 160 },
  ];
  return imageFrom(9, 7, (x, y) => palette[(x * 3 + y * 5) % 4] ?? CLEAR);
}

describe('encodePng', () => {
  it('writes an indexed PNG whose pixels decode back to the image exactly', async () => {
    const image = keyedSheet();
    const encoded = await encodePng(image);
    const decoded = await decodePng(encoded.bytes);

    expect(encoded.paletteEntries).toBe(4);
    expect(decoded.colorType).toBe(3);
    expect(decoded.bitDepth).toBe(8);
    expect(decoded.interlace).toBe(0);
    expect(decoded.width).toBe(image.width);
    expect(decoded.height).toBe(image.height);
    expect([...decoded.pixels]).toEqual([...image.data]);
  });

  it('carries the palette in PLTE and the alphas in tRNS, transparent first', async () => {
    const decoded = await decodePng((await encodePng(keyedSheet())).bytes);
    expect(decoded.palette).toEqual([
      [0, 0, 0],
      [200, 60, 70],
      [120, 200, 90],
      [20, 24, 40],
    ]);
    expect(decoded.transparency).toEqual([0, 160]);
  });

  it('leaves tRNS out of a wholly opaque sheet', async () => {
    const decoded = await decodePng(
      (await encodePng(imageFrom(4, 4, (x) => ({ r: x * 20, g: 0, b: 0, a: 255 })))).bytes,
    );
    expect(decoded.transparency).toBeNull();
    expect(decoded.colorType).toBe(3);
  });

  it('stores every scanline of an indexed sheet unfiltered', async () => {
    const decoded = await decodePng((await encodePng(keyedSheet())).bytes);
    expect(decoded.filters).toEqual(Array.from({ length: 7 }, () => 0));
  });

  it('falls back to truecolour past a palette, and still decodes exactly', async () => {
    const image = imageFrom(MAX_PALETTE_ENTRIES + 1, 2, (x) => ({
      r: x % 256,
      g: Math.floor(x / 256),
      b: 7,
      a: 255,
    }));
    const encoded = await encodePng(image);
    const decoded = await decodePng(encoded.bytes);

    expect(encoded.paletteEntries).toBeNull();
    expect(decoded.colorType).toBe(6);
    expect(decoded.palette).toBeNull();
    expect([...decoded.pixels]).toEqual([...image.data]);
  });

  it('filters a truecolour sheet, rather than storing it as it stands', async () => {
    const image = imageFrom(MAX_PALETTE_ENTRIES + 1, 4, (x, y) => ({
      r: (x + y) % 256,
      g: Math.floor(x / 256),
      b: y,
      a: 255,
    }));
    const decoded = await decodePng((await encodePng(image)).bytes);
    expect(decoded.filters.some((filter) => filter !== 0)).toBe(true);
    expect([...decoded.pixels]).toEqual([...image.data]);
  });

  it('writes a single-pixel sheet', async () => {
    const decoded = await decodePng((await encodePng(imageFrom(1, 1, () => CLEAR))).bytes);
    expect([...decoded.pixels]).toEqual([0, 0, 0, 0]);
  });
});
