import { describe, expect, it } from 'vitest';
import { imageFrom, upscale } from '../test/images.ts';
import { detectPixelGrid } from './pixelGrid.ts';

/** A 16 × 16 source in which every pixel is a different colour, so no block of two is ever uniform. */
const PIXEL_SOURCE = imageFrom(16, 16, (x, y) => ({ r: x * 16 + 1, g: y * 16 + 1, b: 64, a: 255 }));

/**
 * A 40 × 40 image drawn at a grid of 4 — a hundred whole blocks, each a flat colour of its own —
 * with `spoiled` of them carrying one stray pixel. The detection score is therefore exactly
 * `(100 - spoiled) / 100`, which is what makes the threshold testable to the block.
 */
function spottedGrid(spoiled: number): ImageData {
  return imageFrom(40, 40, (x, y) => {
    const cell = Math.floor(y / 4) * 10 + Math.floor(x / 4);
    const stray = cell < spoiled && x % 4 === 1 && y % 4 === 1;
    return { r: (cell * 2 + 1) % 256, g: stray ? 250 : 40, b: 100, a: 255 };
  });
}

describe('detectPixelGrid', () => {
  it('finds the scale a pixel-art sheet was actually drawn at', () => {
    // The case the whole feature exists for: 16 × 16 art delivered on a 128 × 128 canvas. 8 rather
    // than 4, 2 or 1 — all of which also score perfectly — because the coarsest grid that holds is
    // the real one, which is why detection counts down rather than up.
    expect(detectPixelGrid(upscale(PIXEL_SOURCE, 8))).toBe(8);
    expect(detectPixelGrid(upscale(PIXEL_SOURCE, 4))).toBe(4);
  });

  it('believes a grid that scores exactly the threshold', () => {
    // The boundary the early abort has to respect. `GRID_DETECTION_THRESHOLD` says "at or above",
    // and a returned sheet is rarely flawless — this is the near-miss the tolerance exists for.
    //
    // It is also where an "allowed failures" budget goes wrong: `100 * (1 - 0.9)` is
    // 9.999999999999998 in binary floating point, so the tenth failure of a hundred looks like one
    // too many and a grid of 4 is thrown away in favour of 2. That is the optimisation changing the
    // answer rather than only the time, which is the one thing it may not do.
    expect(detectPixelGrid(spottedGrid(10))).toBe(4);
  });

  it('rejects a grid that falls just short of it', () => {
    // The other side of the same boundary: one more spoiled block and the scale is not believed, so
    // detection keeps counting down rather than settling on a scale the art was not drawn at.
    expect(detectPixelGrid(spottedGrid(11))).not.toBe(4);
  });

  it('answers null for smooth artwork rather than inventing a grid', () => {
    // A gradient has flat-looking areas and no scale. `null` is the useful answer: it says the model
    // returned a painted image, and the tab then asks for a grid instead of guessing at one.
    const gradient = imageFrom(64, 64, (x, y) => ({
      r: Math.round((x / 63) * 255),
      g: Math.round((y / 63) * 255),
      b: 128,
      a: 255,
    }));
    expect(detectPixelGrid(gradient)).toBeNull();
  });
});
