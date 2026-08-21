import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import type { Rgba } from '../types/quantiser.ts';
import { createImage } from './imageData.ts';
import { indexImage, MAX_PALETTE_ENTRIES } from './pngPalette.ts';

const OPAQUE_RED: Rgba = { r: 255, g: 0, b: 0, a: 255 };
const OPAQUE_BLUE: Rgba = { r: 0, g: 0, b: 255, a: 255 };
const HALF_GREEN: Rgba = { r: 0, g: 255, b: 0, a: 128 };
const CLEAR: Rgba = { r: 0, g: 0, b: 0, a: 0 };

describe('indexImage', () => {
  it('names one entry per distinct colour and one index per pixel', () => {
    const image = imageFrom(4, 2, (x) => (x < 2 ? OPAQUE_RED : OPAQUE_BLUE));
    const indexed = indexImage(image);
    expect(indexed?.entries).toEqual([OPAQUE_RED, OPAQUE_BLUE]);
    expect([...(indexed?.indices ?? [])]).toEqual([0, 0, 1, 1, 0, 0, 1, 1]);
  });

  it('orders entries by ascending alpha, so tRNS is a prefix of PLTE', () => {
    const shades = [OPAQUE_RED, CLEAR, HALF_GREEN, OPAQUE_BLUE];
    const indexed = indexImage(imageFrom(4, 1, (x) => shades[x] ?? CLEAR));
    expect(indexed?.entries.map((entry) => entry.a)).toEqual([0, 128, 255, 255]);
    expect(indexed?.transparentEntries).toBe(2);
  });

  it('holds first-seen order within one alpha tier', () => {
    const indexed = indexImage(imageFrom(2, 1, (x) => (x === 0 ? OPAQUE_BLUE : OPAQUE_RED)));
    expect(indexed?.entries).toEqual([OPAQUE_BLUE, OPAQUE_RED]);
  });

  it('collapses every fully transparent pixel onto one entry, whatever its dead channels hold', () => {
    const ghosts = [{ r: 200, g: 10, b: 30, a: 0 }, { r: 1, g: 2, b: 3, a: 0 }, CLEAR];
    const indexed = indexImage(imageFrom(3, 1, (x) => ghosts[x] ?? CLEAR));
    expect(indexed?.entries).toEqual([CLEAR]);
    expect([...(indexed?.indices ?? [])]).toEqual([0, 0, 0]);
  });

  it('reports no transparent entries for a wholly opaque sheet', () => {
    expect(indexImage(imageFrom(2, 2, () => OPAQUE_RED))?.transparentEntries).toBe(0);
  });

  it('fills a palette to its last slot', () => {
    const image = imageFrom(MAX_PALETTE_ENTRIES, 1, (x) => ({ r: x, g: 0, b: 0, a: 255 }));
    expect(indexImage(image)?.entries).toHaveLength(MAX_PALETTE_ENTRIES);
  });

  it('refuses one colour past it rather than reducing on the way out', () => {
    const image = imageFrom(MAX_PALETTE_ENTRIES + 1, 1, (x) => ({
      r: x % 256,
      g: Math.floor(x / 256),
      b: 0,
      a: 255,
    }));
    expect(indexImage(image)).toBeNull();
  });

  it('counts the transparent entry against the palette, because the file has to hold it', () => {
    const image = imageFrom(MAX_PALETTE_ENTRIES, 1, (x) => (x === 0 ? CLEAR : { r: x, g: 0, b: 0, a: 255 }));
    expect(indexImage(image)?.entries).toHaveLength(MAX_PALETTE_ENTRIES);
    const oneMore = imageFrom(MAX_PALETTE_ENTRIES + 1, 1, (x) =>
      x === 0 ? CLEAR : { r: (x - 1) % 256, g: 0, b: 0, a: 255 },
    );
    expect(indexImage(oneMore)).toBeNull();
  });

  it('never hands back a palette with nothing in it', () => {
    expect(indexImage(createImage(0, 0))?.entries).toHaveLength(1);
  });
});
