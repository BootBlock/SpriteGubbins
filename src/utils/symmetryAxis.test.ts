import { describe, expect, it } from 'vitest';
import { SYMMETRY_AXIS_SEARCH, SYMMETRY_SWEEP_BUDGET } from '../constants/quantiser.ts';
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

  it('counts a pair inside the tolerance as agreeing, and finds the axis that pairs it', () => {
    // Two halves a step of lightness apart — a fraction of a scaled-OKLab unit, which is the drift a
    // reduction leaves across one flat surface. At exact the halves do not match, so the sprite's
    // real mirror line pairs nothing and the search settles for the partial symmetry inside the left
    // half alone: four of its columns mirror about 11.5, which is a third of the sprite. Admit the
    // step and the true axis pairs the whole of it.
    const paler: Rgba = { ...BODY, r: BODY.r + 12, g: BODY.g + 12, b: BODY.b + 12 };
    const image = sheet(32, 8, (x, y) =>
      y >= 2 && y < 6 && x >= 10 && x < 18 ? (x < 14 ? BODY : paler) : CLEAR,
    );

    const strict = read(image, box(10, 2, 8, 4, 32), 0);
    expect(strict.axis).toBe(11.5);
    expect(strict.confidence).toBeCloseTo(1 / 3, 10);

    const admitting = read(image, box(10, 2, 8, 4, 32), 16);
    expect(admitting.axis).toBe(13.5);
    expect(admitting.confidence).toBe(1);
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
    // Eight columns: body on the left half, trim on the right. Nothing mirrors across the middle, and
    // the best the sprite can offer is the left half mirroring about its own centre at 11.5 — four of
    // the twelve pairs that axis counts, the other eight being trim columns it cannot pair at all.
    //
    // A third is the whole point of the assertion. The obvious `partner > column` loop reaches each
    // pair from its left-hand member only, so a pixel whose partner falls off the *left* is never
    // visited — and this axis then counts only the four pairs it can satisfy, scoring a perfect zero
    // over them while the four unpaired trim columns cost it nothing. That version answers the same
    // axis at a confidence of **1**: a mirror line through a sprite that has none, stated as certain.
    const image = sheet(28, 8, (x, y) =>
      y >= 2 && y < 6 && x >= 10 && x < 18 ? (x < 14 ? BODY : TRIM) : CLEAR,
    );

    const reading = read(image, box(10, 2, 8, 4, 32));

    expect(reading.axis).toBe(11.5);
    expect(reading.confidence).toBeCloseTo(1 / 3, 10);
  });

  it('narrows the search on a sheet whose sprites would spend more than the sweep budget', () => {
    // The bound that stops one large subject turning a keystroke into seconds of work. The fixture is
    // sized from the budget itself rather than from a figure typed here, so it stays true if the
    // budget moves: an area of a sixteenth of it affords sixteen sweeps, which is a reach of three.
    //
    // The artwork mirrors exactly about a line **five** columns right of the box centre — inside the
    // eight the reach would otherwise allow, and outside the three this sheet can afford. So the
    // search cannot reach it: the best it can offer is the nearest line the reach does allow, at a
    // confidence that says plainly it did not find symmetry. Unbounded, the same fixture answers the
    // true axis at a confidence of 1.
    const width = 256;
    const height = SYMMETRY_SWEEP_BUDGET / 16 / width;
    const axis = (width - 1) / 2 + 5;
    // Every column of the mirrored span carries a value that repeats with a long period, so no
    // shorter mirror line inside the span can score as well as the real one.
    const image = sheet(width, height, (x) => {
      if (x < 10) return CLEAR;
      const from = Math.abs(x - axis);
      return { r: 40 + ((from * 37) % 200), g: 90, b: 140, a: FULLY_OPAQUE };
    });

    const reading = read(image, box(0, 0, width, height, width * height));

    const affordable = (Math.floor(SYMMETRY_SWEEP_BUDGET / (width * height)) - 1) / 4;
    expect(Math.abs(reading.axis - (width - 1) / 2)).toBeLessThanOrEqual(affordable);
    expect(reading.axis).not.toBe(axis);
    expect(reading.confidence).toBeLessThan(0.5);
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

  it('reads a one-column sprite as symmetric about its own column, and never snaps it', () => {
    // Symmetric about itself, and with no mirrored pair anywhere in it there is nothing to settle —
    // so the snap must not claim it however low the floor goes. Marked, it would buy a copy of the
    // sheet and a second segmentation to rewrite no pixel, and print "settled" on a row where
    // nothing was. A pole, a spear and a rope are all one column wide.
    const image = sheet(32, 8, (x, y) => (y >= 2 && y < 6 && x === 10 ? BODY : CLEAR));

    const reading = read(image, box(10, 2, 1, 4, 4), 0, 0.5);

    expect(reading.axis).toBe(10);
    expect(reading.confidence).toBe(1);
    expect(reading.snapped).toBe(false);
  });

  it('reads every box it is given, in the order it was given them', () => {
    const image = sheet(32, 8, (x, y) => (y >= 2 && y < 6 && x >= 10 && x < 16 ? BODY : CLEAR));

    const readings = sheetSymmetry(image, [box(10, 2, 6, 4, 24), box(20, 2, 6, 4, 0)], 0, null);

    expect(readings.map((reading) => reading.box.left)).toEqual([10, 20]);
  });
});
