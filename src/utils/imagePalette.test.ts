import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import type { Rgba } from '../types/quantiser.ts';
import { FULLY_OPAQUE, FULLY_TRANSPARENT } from './imageData.ts';
import { imagePalette, reduceImagePalette } from './imagePalette.ts';
import { swatchImage } from './swatchImage.ts';

/**
 * Reading a palette back out of a picture of one.
 *
 * The case that matters most is the round trip: `swatchImage` is what `PaletteDownload` writes, so a
 * palette that left this app as a picture has to come back as the same list in the same order. The
 * rest is what a reader does by accident — dropping a sheet, or a picture with a transparent field.
 */

const BLOCK = 3;

function rgb(r: number, g: number, b: number): Rgba {
  return { r, g, b, a: FULLY_OPAQUE };
}

const RAMP: readonly Rgba[] = [rgb(16, 32, 48), rgb(64, 80, 96), rgb(159, 211, 199)];

describe('imagePalette', () => {
  it('reads a swatch picture back as the list that drew it, in the author’s order', () => {
    // Order is the claim. The ramp runs dark to light, and a reading that sorted by population would
    // hand the reader their own palette shuffled — every block here covers the same area.
    const reading = imagePalette(swatchImage(RAMP, BLOCK), 256);

    expect(reading.entries).toEqual(['#102030', '#405060', '#9FD3C7']);
    expect(reading.colors).toBe(3);
  });

  it('counts a colour once however much of the picture carries it', () => {
    const wide = imageFrom(8, 2, (x) => (x < 7 ? RAMP[0] : RAMP[1]) ?? rgb(0, 0, 0));

    expect(imagePalette(wide, 256).entries).toEqual(['#102030', '#405060']);
  });

  it('takes no colour from a fully transparent pixel, and one from a partly transparent one', () => {
    // Transparency is a statement about the silhouette rather than about colour: a pixel showing
    // nothing has no colour to name, while a pixel at half coverage is the same colour as its
    // neighbour and must not spend a second entry.
    const image = imageFrom(3, 1, (x) => {
      if (x === 0) return { r: 255, g: 0, b: 255, a: FULLY_TRANSPARENT };
      return { ...rgb(16, 32, 48), a: x === 1 ? FULLY_OPAQUE : 128 };
    });

    expect(imagePalette(image, 256).entries).toEqual(['#102030']);
  });

  it('takes no colour from a pixel under the coverage floor', () => {
    const image = imageFrom(2, 1, (x) => (x === 0 ? rgb(16, 32, 48) : { r: 255, g: 0, b: 255, a: 10 }));

    expect(imagePalette(image, 256).entries).toEqual(['#102030']);
  });

  it('refuses a picture holding more colours than the cap, and says how many', () => {
    // A sheet dropped where a swatch was meant. Nothing is pinned, and the count is what makes the
    // refusal actionable rather than a shrug.
    const gradient = imageFrom(4, 1, (x) => rgb(x * 8, 0, 0));

    const reading = imagePalette(gradient, 3);
    expect(reading.entries).toBeNull();
    expect(reading.colors).toBe(4);
  });

  it('keeps a picture that sits exactly on the cap', () => {
    const gradient = imageFrom(4, 1, (x) => rgb(x * 8, 0, 0));

    expect(imagePalette(gradient, 4).entries).toHaveLength(4);
  });
});

describe('reduceImagePalette', () => {
  it('brings a picture down to the cap, in colours it already held', () => {
    const gradient = imageFrom(16, 1, (x) => rgb(x * 16, 0, 0));

    const entries = reduceImagePalette(gradient, 4);

    expect(entries).toHaveLength(4);
    // Never a mean of two, which is the guarantee `buildPalette` makes and the reason this is not a
    // second reducer: every entry is a colour the picture actually contained.
    const held = new Set(imagePalette(gradient, 256).entries);
    for (const entry of entries) expect(held.has(entry)).toBe(true);
  });

  it('leaves a picture already under the cap alone', () => {
    expect(reduceImagePalette(swatchImage(RAMP, BLOCK), 256)).toHaveLength(3);
  });

  it('spends no slot on one colour at two coverages', () => {
    // Unflattened, the quantiser split the two reds on alpha alone and both came back as #C80000,
    // leaving the reader one usable colour of the two they asked for.
    const image = imageFrom(2001, 1, (x) => {
      if (x === 2000) return rgb(201, 0, 0);
      return x % 2 === 0 ? rgb(200, 0, 0) : { ...rgb(200, 0, 0), a: 128 };
    });

    expect(reduceImagePalette(image, 2)).toEqual(['#C80000', '#C90000']);
  });
});
