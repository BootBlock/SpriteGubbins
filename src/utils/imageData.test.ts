import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import type { Rgba } from '../types/quantiser.ts';
import {
  alphaAt,
  CHANNELS_PER_PIXEL,
  copyPixel,
  createImage,
  packColor,
  packedColorAt,
  readPixel,
  unpackColor,
  writePackedColor,
  writePixel,
} from './imageData.ts';

/**
 * The in-place pixel primitives, and the one property that has to hold between them.
 *
 * The quantiser's passes read and write pixels **without building an `Rgba` for each one**, because
 * at the 16.8 million pixels this app admits the object was the cost of the pass. That leaves two
 * spellings of the same packing — the object form and the in-place form — and two spellings of one
 * arithmetic can drift. These tests are what stop them.
 */

/** A colour in every corner of the space the packing has to survive, plus a couple of ordinary ones. */
const COLORS: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 255, g: 255, b: 255, a: 255 },
  // Red above 127 is the case the multiplication in `packColor` exists for: the shifted form goes
  // negative here, and two colours that differ only in sign handling is exactly what a histogram hides.
  { r: 200, g: 1, b: 128, a: 255 },
  { r: 12, g: 34, b: 56, a: 78 },
  { r: 1, g: 0, b: 0, a: 0 },
];

function imageOf(colors: readonly Rgba[]): ImageData {
  return imageFrom(colors.length, 1, (x) => colors[x] ?? { r: 0, g: 0, b: 0, a: 0 });
}

describe('imageData packing', () => {
  it('reads the same integer in place that it packs from an object', () => {
    const image = imageOf(COLORS);

    for (const [index, color] of COLORS.entries()) {
      expect(packedColorAt(image.data, index * CHANNELS_PER_PIXEL)).toBe(packColor(color));
    }
  });

  it('writes the same four bytes in place that it writes through an object', () => {
    const inPlace = createImage(COLORS.length, 1);
    const viaObject = createImage(COLORS.length, 1);

    for (const [index, color] of COLORS.entries()) {
      const offset = index * CHANNELS_PER_PIXEL;
      writePackedColor(inPlace.data, offset, packColor(color));
      writePixel(viaObject.data, offset, unpackColor(packColor(color)));
    }

    expect([...inPlace.data]).toEqual([...viaObject.data]);
  });

  it('round-trips every colour through the packing, in place', () => {
    const image = imageOf(COLORS);
    const output = createImage(COLORS.length, 1);

    for (let offset = 0; offset < image.data.length; offset += CHANNELS_PER_PIXEL) {
      writePackedColor(output.data, offset, packedColorAt(image.data, offset));
    }

    expect([...output.data]).toEqual([...image.data]);
  });

  it('reads alpha without reading the rest', () => {
    const image = imageOf(COLORS);

    for (const [index, color] of COLORS.entries()) {
      expect(alphaAt(image.data, index * CHANNELS_PER_PIXEL)).toBe(color.a);
    }
  });

  it('copies a pixel verbatim, alpha and all', () => {
    const image = imageOf(COLORS);
    const output = createImage(COLORS.length, 1);

    for (let offset = 0; offset < image.data.length; offset += CHANNELS_PER_PIXEL) {
      copyPixel(image.data, output.data, offset);
    }

    // Including the RGB of a fully transparent pixel, which `applyPalette` promises to pass through
    // rather than resolve against the palette.
    expect([...output.data]).toEqual([...image.data]);
    expect(readPixel(output.data, 0)).toEqual(COLORS[0]);
  });
});
