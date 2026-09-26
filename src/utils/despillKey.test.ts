import { describe, expect, it } from 'vitest';
import { DESPILL_DEPTH } from '../constants/quantiser.ts';
import { channels, imageFrom } from '../test/images.ts';
import type { Rgba } from '../types/quantiser.ts';
import { despillKey } from './despillKey.ts';
import { keyBasis } from './keyDistance.ts';
import { srgbToOklab } from './oklab.ts';

/** The recommended key, written out for the reason `keyBackground.test.ts` gives. */
const MAGENTA: Rgba = { r: 255, g: 0, b: 255, a: 255 };

/** What `keyBackground` leaves where the field was, and what this pass reads as the field. */
const CLEARED: Rgba = { r: 0, g: 0, b: 0, a: 0 };

/** Half the key into the near-black the reference sheet is mostly made of: spill, by construction. */
const SPILL: Rgba = { r: 135, g: 8, b: 135, a: 255 };

/** A green nowhere near the key's hue, which no step of the pass may touch. */
const ART: Rgba = { r: 20, g: 180, b: 60, a: 255 };

/** The reference sheet's armour red: over half its chroma lies along magenta's axis, and it is not spill. */
const CHROMATIC_ART: Rgba = { r: 139, g: 43, b: 43, a: 255 };

const BASIS = keyBasis(MAGENTA);

/** The pixel at `x`, `y` of an image. */
function pixelAt(image: ImageData, x: number, y = 0): Rgba {
  const at = (y * image.width + x) * 4;
  const [r = 0, g = 0, b = 0, a = 0] = image.data.subarray(at, at + 4);
  return { r, g, b, a };
}

/** How much chroma a colour carries along the key's hue, on the scaled OKLab axes. */
function keyChroma(color: Rgba): number {
  const { a, b } = srgbToOklab(color.r, color.g, color.b);
  return a * BASIS.hueA + b * BASIS.hueB;
}

/** A single row, as `keyBackground.test.ts` builds its fixtures. */
function row(...pixels: readonly Rgba[]): ImageData {
  return imageFrom(pixels.length, 1, (x) => pixels[x] ?? ART);
}

describe('despillKey', () => {
  it('removes the key’s hue from spill inside the band, and keeps its lightness and alpha', () => {
    const image = row(CLEARED, SPILL, SPILL, SPILL, ART);
    despillKey(image, BASIS);

    for (let x = 1; x <= DESPILL_DEPTH; x += 1) {
      const corrected = pixelAt(image, x);
      expect(keyChroma(SPILL)).toBeGreaterThan(20);
      // Within what rounding a colour back to bytes leaves behind.
      expect(Math.abs(keyChroma(corrected))).toBeLessThan(1.5);
      expect(srgbToOklab(corrected.r, corrected.g, corrected.b).L).toBeCloseTo(
        srgbToOklab(SPILL.r, SPILL.g, SPILL.b).L,
        0,
      );
      expect(corrected.a).toBe(255);
    }
  });

  it('leaves a colour with a hue of its own untouched, however near the field it sits', () => {
    const image = row(CLEARED, CHROMATIC_ART, ART, CHROMATIC_ART);
    despillKey(image, BASIS);

    expect(channels(image)).toEqual(channels(row(CLEARED, CHROMATIC_ART, ART, CHROMATIC_ART)));
  });

  it('leaves the field and every pixel past the band as they were', () => {
    const past = Array.from({ length: 3 }, () => SPILL);
    const image = row(CLEARED, ART, ART, ART, ...past);
    despillKey(image, BASIS);

    expect(channels(image)).toEqual(channels(row(CLEARED, ART, ART, ART, ...past)));
  });

  it('keeps the key’s hue where it runs past the band, as artwork painted in it does', () => {
    // The guard: a tint one ring past the band marks the region as artwork, and the mark walks out
    // to the field through the tinted pixels between.
    const painted = Array.from({ length: DESPILL_DEPTH + 2 }, () => SPILL);
    const image = row(CLEARED, ...painted);
    despillKey(image, BASIS);

    expect(channels(image)).toEqual(channels(row(CLEARED, ...painted)));
  });

  it('lets a deep tint guard only the pixels joined to it on the way out, not the whole edge', () => {
    // Top row: the field. Second row: spill along the whole edge. Column 0: a stripe painted in the
    // key's hue, running deeper than the band. The stripe keeps its colour, and the spill beside it
    // loses the key's hue, because the mark only walks outward from a deeper tinted pixel.
    const height = DESPILL_DEPTH + 3;
    const image = imageFrom(4, height, (x, y) => {
      if (y === 0) return CLEARED;
      return x === 0 || y === 1 ? SPILL : ART;
    });
    despillKey(image, BASIS);

    for (let y = 1; y < height; y += 1) expect(pixelAt(image, 0, y)).toEqual(SPILL);
    for (let x = 1; x < 4; x += 1) expect(Math.abs(keyChroma(pixelAt(image, x, 1)))).toBeLessThan(1.5);
  });

  it('does not let the walk wrap from one end of a row onto the other end of the next', () => {
    // A field pixel at one end of a row puts a ring-one pixel beside it at that end of the next row,
    // and the pixel that ring-one pixel's missing neighbour would wrap to sits seven steps from the
    // field in the image: past the band, so it must stay. Walked in both directions, because each
    // needs its own bounds check.
    const cases = [
      { field: { x: 0, y: 2 }, spill: { x: 5, y: 0 } },
      { field: { x: 5, y: 0 }, spill: { x: 0, y: 2 } },
    ];
    for (const { field, spill } of cases) {
      const image = imageFrom(6, 3, (x, y) => {
        if (x === field.x && y === field.y) return CLEARED;
        return x === spill.x && y === spill.y ? SPILL : ART;
      });
      despillKey(image, BASIS);

      expect(pixelAt(image, spill.x, spill.y)).toEqual(SPILL);
    }
  });

  it('changes nothing under a key with no hue to remove', () => {
    const white: Rgba = { r: 255, g: 255, b: 255, a: 255 };
    const image = row(CLEARED, SPILL, SPILL);
    despillKey(image, keyBasis(white));

    expect(channels(image)).toEqual(channels(row(CLEARED, SPILL, SPILL)));
  });
});
