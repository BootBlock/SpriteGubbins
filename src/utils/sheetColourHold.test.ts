import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import { colorHistogram, pixelOffset, readPixel } from './imageData.ts';
import { resampleArea } from './resampleArea.ts';
import { sheetColourHold } from './sheetColourHold.ts';

const NAVY = { r: 20, g: 30, b: 120, a: 255 } as const;
const GOLD = { r: 230, g: 190, b: 40, a: 255 } as const;
const CLEAR = { r: 0, g: 0, b: 0, a: 0 } as const;

/** A checker of two palette colours inside a clear border: every resample of it blends the two. */
const SHEET = imageFrom(12, 12, (x, y) => {
  if (x < 2 || y < 2 || x >= 10 || y >= 10) return CLEAR;
  return (x + y) % 2 === 0 ? NAVY : GOLD;
});

function at(image: ImageData, x: number, y: number) {
  return readPixel(image.data, pixelOffset(image.width, x, y));
}

/** Every colour an image holds, as packed keys, transparency aside. */
function colours(image: ImageData): ReadonlySet<number> {
  return new Set(colorHistogram(image).keys());
}

describe('sheetColourHold', () => {
  const resized = resampleArea(SHEET, { left: 0, top: 0, width: 12, height: 12 }, 5, 5);

  it('needs to exist: resizing alone writes colours the sheet does not hold', () => {
    const sheetColours = colours(SHEET);

    expect([...colours(resized)].some((colour) => !sheetColours.has(colour))).toBe(true);
  });

  it('leaves a resized sprite holding no colour its sheet does not hold', () => {
    const held = sheetColourHold(SHEET)(resized);
    const sheetColours = colours(SHEET);

    expect([...colours(held)].every((colour) => sheetColours.has(colour))).toBe(true);
  });

  it('takes a hard-edged sheet’s edges to clear or opaque at half coverage, so the outline holds', () => {
    // Every pixel of the sheet is clear or opaque, so a partly covered edge must become one of them.
    const held = sheetColourHold(SHEET)(resized);

    for (let offset = 3; offset < held.data.length; offset += 4) {
      expect([0, 255]).toContain(held.data[offset]);
    }
    // The corner covers 2.4 × 2.4 source pixels of which 0.16 are artwork: clear.
    expect(at(held, 0, 0)).toStrictEqual(CLEAR);
  });

  it('keeps a soft edge where the sheet itself has soft edges to match', () => {
    const soft = imageFrom(4, 1, (x) => (x < 2 ? NAVY : { ...NAVY, a: 128 }));
    const halfway = imageFrom(1, 1, () => ({ ...NAVY, a: 140 }));

    expect(at(sheetColourHold(soft)(halfway), 0, 0)).toStrictEqual({ ...NAVY, a: 128 });
  });
});
