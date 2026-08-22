import { describe, expect, it } from 'vitest';
import { coverageBlend } from './coverageBlend.ts';
import { FULLY_OPAQUE, FULLY_TRANSPARENT } from './imageData.ts';

const BLACK = { r: 0, g: 0, b: 0, a: FULLY_OPAQUE };
const WHITE = { r: 255, g: 255, b: 255, a: FULLY_OPAQUE };
const GREEN = { r: 0, g: 200, b: 80, a: FULLY_OPAQUE };
/** A cleared pixel that still carries the bytes of the colour it was — what a keyed sheet holds. */
const CLEARED = { r: 255, g: 0, b: 255, a: FULLY_TRANSPARENT };

describe('coverageBlend', () => {
  it('hands back the pixel unchanged at no coverage', () => {
    expect(coverageBlend(GREEN, WHITE, 0)).toEqual(GREEN);
  });

  it('gives the neighbour outright at full coverage', () => {
    expect(coverageBlend(GREEN, WHITE, 1)).toEqual(WHITE);
  });

  it('mixes in linear light, not in bytes', () => {
    // The figure `oklab.ts` states for the dither's mixing plan, asked of the same transfer
    // function: half of black and white is sRGB 188, where averaging the bytes would give 128.
    const half = coverageBlend(BLACK, WHITE, 0.5);
    expect(half).toEqual({ r: 188, g: 188, b: 188, a: FULLY_OPAQUE });
  });

  it('thins a pixel toward a cleared neighbour without taking its colour', () => {
    // The silhouette case. A cleared pixel's bytes are not a colour — `pixelDistance` refuses to
    // compare them for the same reason — and premultiplying is what keeps them out of the answer:
    // the magenta under the cleared pixel contributes nothing at all.
    const soft = coverageBlend(GREEN, CLEARED, 0.5);
    expect(soft.a).toBe(128);
    expect({ r: soft.r, g: soft.g, b: soft.b }).toEqual({ r: GREEN.r, g: GREEN.g, b: GREEN.b });
  });

  it('gives a cleared pixel the neighbour’s colour at the coverage it gained', () => {
    const soft = coverageBlend(CLEARED, WHITE, 0.5);
    expect(soft).toEqual({ r: 255, g: 255, b: 255, a: 128 });
  });

  it('writes nothing at all where both sides are clear', () => {
    // Not reachable from the pass, which never claims a boundary two cleared pixels share — but the
    // division by the resulting coverage has to have an answer, and zero throughout is what every
    // other pass in the pipeline writes for a pixel that carries nothing.
    expect(coverageBlend(CLEARED, { ...CLEARED, r: 0, b: 0 }, 0.5)).toEqual({
      r: 0,
      g: 0,
      b: 0,
      a: FULLY_TRANSPARENT,
    });
  });

  it('moves each channel monotonically with the coverage', () => {
    let previous = -1;
    for (const coverage of [0, 0.1, 0.25, 0.4, 0.5]) {
      const value = coverageBlend(BLACK, WHITE, coverage).r;
      expect(value).toBeGreaterThan(previous);
      previous = value;
    }
  });
});
