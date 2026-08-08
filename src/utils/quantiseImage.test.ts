import { describe, expect, it } from 'vitest';
import { PALETTE_COLOR_COUNTS } from '../constants/quantiser.ts';
import { channels, imageFrom, upscale } from '../test/images.ts';
import type { Rgba } from '../types/quantiser.ts';
import { countColors, pixelOffset, readPixel } from './imageData.ts';
import { quantiseImage } from './quantiseImage.ts';

/** 16 × 16 art, every pixel a different colour. */
const SPRITE = imageFrom(16, 16, (x, y) => ({ r: x * 16 + 1, g: y * 16 + 1, b: 64, a: 255 }));

/** 200 pixels, every one a different colour, already at its own resolution. */
const TWO_HUNDRED_COLORS = imageFrom(20, 10, (x, y) => {
  const n = y * 20 + x;
  return { r: (n * 7) % 256, g: (n * 13) % 256, b: (n * 29) % 256, a: 255 };
});

const MAGENTA: Rgba = { r: 255, g: 0, b: 255, a: 255 };
const TRANSPARENT: Rgba = { r: 0, g: 0, b: 0, a: 0 };
const ART: Rgba = { r: 20, g: 180, b: 60, a: 255 };

const KEYING = { color: MAGENTA, tolerance: 16 };

/**
 * A 32 × 32 sheet holding a 20 × 20 sprite, deliberately **offset by 6** so the artwork straddles the
 * cells of the grid of 8 it is quantised at, on all four sides.
 *
 * The field is a *drifting* magenta — 64 distinct near-magentas, laid out so no two pixels within any
 * one 8 × 8 cell share a colour. That is exactly what a returned sheet looks like, and it is the
 * condition the ordering test below turns on: each of those colours polls a single vote in the modal
 * alignment, so any colour appearing twice beats all of them.
 *
 * Blue is pinned at 255, so only two channels drift and by at most 7 each: the widest of them is 9.9
 * from the key, well inside `KEYING`. The sprite colour is 354 away, so it is outside both the field
 * and the fringe threshold and cannot be eroded.
 */
const STRADDLING_SHEET = imageFrom(32, 32, (x, y) => {
  if (x >= 6 && x < 26 && y >= 6 && y < 26) return ART;
  const withinCell = (y % 8) * 8 + (x % 8);
  return { r: 255 - (withinCell % 8), g: Math.floor(withinCell / 8), b: 255, a: 255 };
});

/** The reduced sheet as a grid of colours, which is what the two orderings actually disagree about. */
function pixels(image: ImageData): Rgba[][] {
  const rows: Rgba[][] = [];
  for (let y = 0; y < image.height; y += 1) {
    const row: Rgba[] = [];
    for (let x = 0; x < image.width; x += 1) {
      row.push(readPixel(image.data, pixelOffset(image.width, x, y)));
    }
    rows.push(row);
  }
  return rows;
}

describe('quantiseImage', () => {
  it('recovers the art a sheet was drawn at from the sheet it came back on', () => {
    // The whole feature in one assertion: 16 × 16 art returned on a 128 × 128 canvas comes back as
    // the 16 × 16 art, pixel for pixel, with nothing invented and nothing lost.
    const result = quantiseImage(upscale(SPRITE, 8), { grid: 8, key: null, maxColors: null });

    expect(result.image.width).toBe(16);
    expect(result.image.height).toBe(16);
    expect(channels(result.image)).toEqual(channels(SPRITE));
  });

  it('reduces the palette to the colour count it is given', () => {
    const result = quantiseImage(TWO_HUNDRED_COLORS, { grid: 1, key: null, maxColors: 32 });

    expect(countColors(TWO_HUNDRED_COLORS)).toBe(200);
    expect(result.colors).toBe(32);
  });

  it('leaves the colours alone for UNRESTRICTED', () => {
    // `UNRESTRICTED` is `null` rather than a generous cap, and this is what that buys: a painted or
    // 3D-rendered sheet passes through the palette step untouched instead of being reduced to some
    // figure nobody chose. A grid of 1 is the identity for the two steps before it.
    const result = quantiseImage(TWO_HUNDRED_COLORS, {
      grid: 1,
      key: null,
      maxColors: PALETTE_COLOR_COUNTS.UNRESTRICTED,
    });

    expect(PALETTE_COLOR_COUNTS.UNRESTRICTED).toBeNull();
    expect(result.colors).toBe(countColors(TWO_HUNDRED_COLORS));
    expect(channels(result.image)).toEqual(channels(TWO_HUNDRED_COLORS));
  });

  it('counts the colours of the result, not of the steps that produced it', () => {
    // The summary claims "256 colours became 32", and the second figure is this one. The first is
    // `SheetFacts.colors`, measured once when the sheet loads rather than again on every settings
    // change — so the two are read off different values and both have to mean what they say.
    const source = upscale(SPRITE, 8);
    const result = quantiseImage(source, { grid: 8, key: null, maxColors: 32 });

    expect(countColors(source)).toBe(256);
    expect(result.colors).toBe(32);
  });

  it('keys the field before the alignment votes, so the sprite does not dilate into it', () => {
    // The load-bearing claim about the pipeline's *order*, stated as the difference it makes.
    //
    // Without keying, every cell that holds two or more sprite pixels resolves to the sprite, because
    // each drifting magenta beside them polls one vote. A 20 × 20 sprite offset across an 8-grid puts
    // at least four sprite pixels in every one of the sixteen cells — so the whole 4 × 4 result comes
    // back as solid sprite and the background is gone entirely.
    const dilated = quantiseImage(STRADDLING_SHEET, { grid: 8, key: null, maxColors: null });

    expect(pixels(dilated.image)).toEqual(
      Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => ART)),
    );

    // Keying first collapses those 62-odd distinct magentas into one value before the vote is taken, so
    // they outnumber the sprite in the cells they dominate. The sprite lands on the middle 2 × 2 — the
    // four cells it genuinely fills — and the ring around it is empty.
    const keyed = quantiseImage(STRADDLING_SHEET, { grid: 8, key: KEYING, maxColors: null });

    expect(pixels(keyed.image)).toEqual([
      [TRANSPARENT, TRANSPARENT, TRANSPARENT, TRANSPARENT],
      [TRANSPARENT, ART, ART, TRANSPARENT],
      [TRANSPARENT, ART, ART, TRANSPARENT],
      [TRANSPARENT, TRANSPARENT, TRANSPARENT, TRANSPARENT],
    ]);
  });

  it('reports the share of the sheet the key removed', () => {
    const result = quantiseImage(STRADDLING_SHEET, { grid: 8, key: KEYING, maxColors: null });

    // 32 × 32 less the 20 × 20 sprite: 624 of 1024. The sprite is far outside the fringe threshold, so
    // nothing is eroded off it and the figure is exactly the field.
    expect(result.keyedShare).toBe(624 / 1024);
  });

  it('spends no palette slots on the keyed field, and none on the colours it removed', () => {
    // `colorHistogram` excludes fully transparent pixels, which is why nothing downstream needed
    // changing: the field claims no slots, so a strict budget buys the subject's own colours.
    const result = quantiseImage(STRADDLING_SHEET, { grid: 8, key: KEYING, maxColors: 32 });

    // 64 drifting magentas plus the one sprite colour went in; one colour survives.
    expect(countColors(STRADDLING_SHEET)).toBe(65);
    expect(result.colors).toBe(1);
  });

  it('leaves every pixel where it is when keying is off', () => {
    // The regression guard for a pass inserted at the front of an existing transform: a sheet that is
    // *entirely* the key colour comes back untouched, and the share is zero rather than unreported.
    const field = imageFrom(4, 4, () => MAGENTA);

    const result = quantiseImage(field, { grid: 1, key: null, maxColors: null });

    expect(channels(result.image)).toEqual(channels(field));
    expect(result.keyedShare).toBe(0);
  });
});
