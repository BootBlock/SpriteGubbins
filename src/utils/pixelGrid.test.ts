import { describe, expect, it } from 'vitest';
import { imageFrom, soften, upscale } from '../test/images.ts';
import { detectPixelGrid, measureSheetScale } from './pixelGrid.ts';

/** A 16 × 16 source in which every pixel is a different colour, so no block of two is ever uniform. */
const PIXEL_SOURCE = imageFrom(16, 16, (x, y) => ({ r: x * 16 + 1, g: y * 16 + 1, b: 64, a: 255 }));

/**
 * A 40 × 40 image drawn at a grid of 4, with `spoiled` of its hundred cells carrying one stray pixel.
 *
 * The lattice contributes 720 transitions — nine interior boundaries each way, forty pixels long —
 * and each stray adds exactly four that miss it: two columns and two rows, at the pixel and again
 * where it ends. So the score is `720 / (720 + 4 × spoiled)`, which is what makes the threshold
 * testable to the pixel.
 */
function spottedGrid(spoiled: number): ImageData {
  return imageFrom(40, 40, (x, y) => {
    const cell = Math.floor(y / 4) * 10 + Math.floor(x / 4);
    const stray = cell < spoiled && x % 4 === 1 && y % 4 === 1;
    return { r: (cell * 2 + 1) % 256, g: stray ? 250 : 40, b: 100, a: 255 };
  });
}

/**
 * A 256 × 256 sheet holding a single 32 × 32 sprite drawn at a grid of 4, on a flat magenta field.
 *
 * The shape a returned sheet very often has — a few small components with a great deal of key field
 * around them — and the one the previous detector could not read. Scored on *uniform blocks*, this
 * image is 63 flat blocks out of 64 at a candidate of 32, so 32 was believed and the art was reduced
 * to a smear.
 */
function sparseSheet(): ImageData {
  return imageFrom(256, 256, (x, y) => {
    if (x >= 32 || y >= 32) return { r: 255, g: 0, b: 255, a: 255 };
    const cell = Math.floor(y / 4) * 8 + Math.floor(x / 4);
    return { r: (cell * 7 + 3) % 256, g: (cell * 31) % 256, b: 90, a: 255 };
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

  it('measures the art rather than the empty space around it', () => {
    // The regression this detector was rewritten for. Empty canvas is not evidence of a scale, and
    // counting flat blocks let it behave as though it were: at 99% background, whatever the art was
    // drawn at, the answer came back as the largest candidate there is.
    expect(detectPixelGrid(sparseSheet())).toBe(4);
  });

  it('measures a sprite-scale sheet, past the old fixed ceiling', () => {
    // One 16 × 16 sprite filling a 1024-pixel canvas is a grid of 64. Under a fixed ceiling of 32
    // this came back as 32 — a finer, lossless reading of the same lattice, which reduced the sheet
    // to twice the size that was asked for while reading as an exact measurement.
    expect(detectPixelGrid(upscale(PIXEL_SOURCE, 64))).toBe(64);
  });

  it('derives its ceiling from the image, so two-cell art is measurable at any size', () => {
    // Half the shorter edge is the coarsest scale an image can attest — one interior boundary each
    // way, the smallest sheet that holds a period at all.
    const twoCells = imageFrom(2, 2, (x, y) =>
      (x + y) % 2 === 0 ? { r: 30, g: 200, b: 90, a: 255 } : { r: 220, g: 60, b: 40, a: 255 },
    );
    expect(detectPixelGrid(upscale(twoCells, 128))).toBe(128);
  });

  it('never answers past what the manual box could hold', () => {
    // Art genuinely drawn coarser than the manual ceiling comes back as the coarsest divisor the
    // range holds — an under-reduction the user can finish in the box, never a value they could not
    // have typed into it.
    const twoCells = imageFrom(2, 2, (x, y) =>
      (x + y) % 2 === 0 ? { r: 30, g: 200, b: 90, a: 255 } : { r: 220, g: 60, b: 40, a: 255 },
    );
    expect(detectPixelGrid(upscale(twoCells, 512))).toBe(256);
  });

  it('refuses a stray feature whatever candidates the raised ceiling admits', () => {
    // A one-pixel line in the sheet's interior is two transition columns — where it starts and
    // where it ends — and no lattice holds both, so no candidate accounts for nine tenths of this
    // sheet however coarse the image's own ceiling lets it look. (A line touching the far edge has
    // no end inside the image and reads as a coarse two-cell sheet instead — losslessly, and under
    // the old fixed ceiling as much as this one.)
    const flat = { r: 40, g: 40, b: 40, a: 255 };
    const mark = { r: 200, g: 10, b: 10, a: 255 };
    expect(detectPixelGrid(imageFrom(256, 256, (x) => (x === 100 ? mark : flat)))).toBeNull();
  });

  it('believes a grid that scores exactly the threshold', () => {
    // The boundary itself. `GRID_DETECTION_THRESHOLD` says "at or above", and 720 of 800 is exactly
    // nine tenths — a returned sheet is rarely flawless, and this is the near-miss the tolerance
    // exists for.
    expect(detectPixelGrid(spottedGrid(20))).toBe(4);
  });

  it('rejects a grid that falls just short of it', () => {
    // One more stray and the scale is not believed, so detection keeps counting down rather than
    // settling on a scale the art was not drawn at.
    expect(detectPixelGrid(spottedGrid(21))).not.toBe(4);
  });

  it('answers null for smooth artwork rather than inventing a grid', () => {
    // A gradient changes at nearly every pixel, so no lattice can account for more than a fraction of
    // it. `null` is the useful answer: it says the model returned a painted image, and the tab then
    // asks for a grid instead of guessing at one.
    const gradient = imageFrom(64, 64, (x, y) => ({
      r: Math.round((x / 63) * 255),
      g: Math.round((y / 63) * 255),
      b: 128,
      a: 255,
    }));
    expect(detectPixelGrid(gradient)).toBeNull();
  });

  it('answers null for an image with nothing in it to measure', () => {
    // The other end of the same honesty. One flat colour edge to edge changes nowhere, so every
    // candidate fits it equally and none of them is a measurement — where the block count would have
    // reported the largest candidate with complete confidence.
    expect(detectPixelGrid(imageFrom(64, 64, () => ({ r: 10, g: 20, b: 30, a: 255 })))).toBeNull();
  });
});

describe('measureSheetScale', () => {
  it('reports an exact reading where every transition falls on the lattice', () => {
    // Nothing is estimated about crisp art, and the reading says so: the tab shows this as a
    // measurement, adopts it as the grid in force, and asks the user for nothing.
    expect(measureSheetScale(upscale(PIXEL_SOURCE, 8))).toEqual({ grid: 8, measurement: 'EXACT' });
  });

  it('falls back to the estimate where softening has destroyed the transitions', () => {
    // The same art, resampled. `detectPixelGrid` cannot see it — that is the gap this fallback
    // exists for — and what comes back is the same scale carrying the label that stops it being
    // adopted silently.
    const resampled = soften(upscale(PIXEL_SOURCE, 8));
    expect(detectPixelGrid(resampled)).toBeNull();
    expect(measureSheetScale(resampled)).toEqual({ grid: 8, measurement: 'ESTIMATED' });
  });

  it('never estimates over an exact reading', () => {
    // The two are tried in order and never both. An exact reading has no tolerance in it, so a
    // second opinion could only disagree with it — and the sheet gets one pass rather than two.
    expect(measureSheetScale(spottedGrid(20))).toEqual({ grid: 4, measurement: 'EXACT' });
  });

  it('answers null where neither reading finds a scale', () => {
    // Smooth artwork with no scale in it at all, which is what the panel's "type it yourself"
    // guidance is written for.
    const gradient = imageFrom(64, 64, (x, y) => ({
      r: Math.round((x / 63) * 255),
      g: Math.round((y / 63) * 255),
      b: 128,
      a: 255,
    }));
    expect(measureSheetScale(gradient)).toBeNull();
  });
});
