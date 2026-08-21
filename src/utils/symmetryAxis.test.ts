import { describe, expect, it } from 'vitest';
import { SYMMETRY_AXIS_SEARCH } from '../constants/quantiser.ts';
import type { Rgba, SpriteBox } from '../types/quantiser.ts';
import { imageFrom } from '../test/images.ts';
import { FULLY_OPAQUE, FULLY_TRANSPARENT } from './imageData.ts';
import { sheetSymmetry } from './symmetryAxis.ts';

const CLEAR: Rgba = { r: 0, g: 0, b: 0, a: FULLY_TRANSPARENT };
const BODY: Rgba = { r: 90, g: 110, b: 140, a: FULLY_OPAQUE };
const TRIM: Rgba = { r: 210, g: 180, b: 60, a: FULLY_OPAQUE };

/** A sheet whose every pixel is a function of its position — the shape every fixture below paints. */
function sheet(width: number, height: number, paint: (x: number, y: number) => Rgba): ImageData {
  return imageFrom(width, height, paint);
}

/** The box a fixture's artwork occupies, stated rather than segmented — this suite is about axes. */
function box(left: number, top: number, width: number, height: number, pixels: number): SpriteBox {
  return { left, top, width, height, pixels };
}

/** One reading, which is all every fixture below produces. */
function read(image: ImageData, bounds: SpriteBox, tolerance = 0, floor: number | null = null) {
  const [only] = sheetSymmetry(image, [bounds], tolerance, floor);
  if (only === undefined) throw new Error('Expected one reading.');
  return only;
}

describe('sheetSymmetry', () => {
  it('puts the axis on the seam of an even-width sprite that mirrors exactly', () => {
    // Six columns wide, so the mirror line falls *between* columns 12 and 13 — a whole-column search
    // could not name it, and the half-step candidates are what make it expressible.
    const image = sheet(32, 8, (x, y) =>
      y >= 2 && y < 6 && x >= 10 && x < 16 ? (x === 10 || x === 15 ? TRIM : BODY) : CLEAR,
    );

    const reading = read(image, box(10, 2, 6, 4, 24));

    expect(reading.axis).toBe(12.5);
    expect(reading.confidence).toBe(1);
  });

  it('puts the axis down the middle column of an odd-width sprite that mirrors exactly', () => {
    const image = sheet(32, 8, (x, y) =>
      y >= 2 && y < 6 && x >= 10 && x < 17 ? (x === 10 || x === 16 ? TRIM : BODY) : CLEAR,
    );

    const reading = read(image, box(10, 2, 7, 4, 28));

    expect(reading.axis).toBe(13);
    expect(reading.confidence).toBe(1);
  });

  it('reports the share that mirrors, not merely whether anything does', () => {
    // Sixteen pairs, one of which disagrees: the left member of the top row is trim where its
    // partner is body. Fifteen of sixteen is the figure the panel prints.
    const image = sheet(32, 8, (x, y) => {
      if (y < 2 || y >= 6 || x < 10 || x >= 18) return CLEAR;
      return y === 2 && x === 10 ? TRIM : BODY;
    });

    const reading = read(image, box(10, 2, 8, 4, 32));

    expect(reading.axis).toBe(13.5);
    expect(reading.confidence).toBeCloseTo(15 / 16, 10);
  });

  it('counts a pair inside the tolerance as agreeing', () => {
    // The two halves differ by one step of lightness, which is a fraction of a scaled-OKLab unit —
    // exact refuses it and any working tolerance admits it.
    const paler: Rgba = { ...BODY, r: BODY.r + 12, g: BODY.g + 12, b: BODY.b + 12 };
    const image = sheet(32, 8, (x, y) =>
      y >= 2 && y < 6 && x >= 10 && x < 18 ? (x < 14 ? BODY : paler) : CLEAR,
    );

    expect(read(image, box(10, 2, 8, 4, 32), 0).confidence).toBe(0);
    expect(read(image, box(10, 2, 8, 4, 32), 16).confidence).toBe(1);
  });

  it('does not count a pair of empty pixels as evidence of symmetry', () => {
    // A single opaque pixel in one corner of a large box. Every other pair is empty against empty,
    // and counting those would report this as almost perfectly symmetric — the failure that makes a
    // sprite holding a diagonal weapon read as symmetric because the box around it is mostly air.
    const image = sheet(32, 16, (x, y) => (x === 10 && y === 2 ? BODY : CLEAR));

    expect(read(image, box(10, 2, 8, 8, 1)).confidence).toBe(0);
  });

  it('follows the axis off the box centre when an appendage moved the centre', () => {
    // A symmetric six-column body at 10–15, plus a two-column arm at 16–17 that nothing mirrors. The
    // box centre is 13.5 and the body's own axis is 12.5, which is where the score is lowest.
    const image = sheet(32, 8, (x, y) => {
      if (y < 2 || y >= 6) return CLEAR;
      if (x >= 10 && x < 16) return BODY;
      return x >= 16 && x < 18 && y === 3 ? TRIM : CLEAR;
    });

    const reading = read(image, box(10, 2, 8, 4, 26));

    expect(reading.axis).toBe(12.5);
    // Not 1: the arm has no counterpart, so those pairs are counted and score the whole alpha span.
    expect(reading.confidence).toBeLessThan(1);
    expect(reading.confidence).toBeGreaterThan(0.8);
  });

  it('reports a low confidence about the centre rather than an axis it never tried', () => {
    // The body's true axis sits far outside the search bound, so the honest answer is that nothing
    // symmetric was found here — never an axis the sweep did not score.
    const width = 4 * (SYMMETRY_AXIS_SEARCH + 4);
    const image = sheet(width + 20, 8, (x, y) => (y >= 2 && y < 6 && x >= 0 && x < 6 ? BODY : CLEAR));

    const reading = read(image, box(0, 2, width, 4, 24));

    expect(reading.axis).toBe((width - 1) / 2);
    expect(reading.confidence).toBeLessThan(0.5);
  });

  it('counts a pixel whose partner falls off the left of the box, as it does one off the right', () => {
    // Eight columns: body on the left half, trim on the right. Nothing here mirrors, so the honest
    // answer is the box centre at no confidence at all.
    //
    // The obvious `partner > column` loop reaches the same pair from its left-hand member only, so a
    // pixel whose partner falls off the *left* is never visited — and an axis pushed hard left then
    // scores a perfect zero over the two pairs it still counts, while the four unpaired trim columns
    // cost it nothing. That version answers 11.5 at a confidence of 1: a mirror line through a
    // sprite that has no mirror line, stated as certain.
    const image = sheet(28, 8, (x, y) =>
      y >= 2 && y < 6 && x >= 10 && x < 18 ? (x < 14 ? BODY : TRIM) : CLEAR,
    );

    const reading = read(image, box(10, 2, 8, 4, 32));

    expect(reading.axis).toBe(13.5);
    expect(reading.confidence).toBe(0);
  });

  it('marks a sprite for the snap only once it reaches the floor', () => {
    const image = sheet(32, 8, (x, y) => (y >= 2 && y < 6 && x >= 10 && x < 16 ? BODY : CLEAR));

    expect(read(image, box(10, 2, 6, 4, 24), 0, null).snapped).toBe(false);
    expect(read(image, box(10, 2, 6, 4, 24), 0, 1).snapped).toBe(true);
  });

  it('carries the box it measured, so a reading survives the segmentation changing under it', () => {
    const image = sheet(32, 8, (x, y) => (y >= 2 && y < 6 && x >= 10 && x < 16 ? BODY : CLEAR));
    const bounds = box(10, 2, 6, 4, 24);

    expect(read(image, bounds).box).toEqual(bounds);
  });

  it('reads a one-column sprite as symmetric about its own column', () => {
    const image = sheet(32, 8, (x, y) => (y >= 2 && y < 6 && x === 10 ? BODY : CLEAR));

    const reading = read(image, box(10, 2, 1, 4, 4));

    expect(reading.axis).toBe(10);
    expect(reading.confidence).toBe(1);
  });

  it('reads every box it is given, in the order it was given them', () => {
    const image = sheet(32, 8, (x, y) => (y >= 2 && y < 6 && x >= 10 && x < 16 ? BODY : CLEAR));

    const readings = sheetSymmetry(image, [box(10, 2, 6, 4, 24), box(20, 2, 6, 4, 0)], 0, null);

    expect(readings.map((reading) => reading.box.left)).toEqual([10, 20]);
  });
});
