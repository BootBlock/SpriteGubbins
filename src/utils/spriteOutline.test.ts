import { describe, expect, it } from 'vitest';
import { SPRITE_MARKER } from '../constants/spriteMarker.ts';
import type { Rgba, SpriteBox } from '../types/quantiser.ts';
import { imageFrom } from '../test/images.ts';
import { FULLY_OPAQUE, FULLY_TRANSPARENT, pixelOffset, readPixel } from './imageData.ts';
import { oklabToSrgb, oklchToOklab } from './oklab.ts';
import { outlineSprites } from './spriteOutline.ts';

const ART = { r: 200, g: 40, b: 90, a: FULLY_OPAQUE };
const CLEAR = { r: 0, g: 0, b: 0, a: FULLY_TRANSPARENT };

/** One of the two marker colours, resolved the way the module resolves them. */
function marker(index: number): Rgba {
  const stop = SPRITE_MARKER[index];
  if (stop === undefined) throw new Error(`No marker stop at ${String(index)}`);
  return oklabToSrgb(oklchToOklab(stop.oklch[0], stop.oklch[1], stop.oklch[2]));
}

function at(image: ImageData, x: number, y: number): Rgba {
  return readPixel(image.data, pixelOffset(image.width, x, y));
}

/** A sheet of clear pixels carrying one solid square, and the box that describes it. */
const BOX: SpriteBox = { left: 4, top: 4, width: 3, height: 3, pixels: 9 };
const SHEET = imageFrom(16, 16, (x, y) =>
  x >= BOX.left && x < BOX.left + BOX.width && y >= BOX.top && y < BOX.top + BOX.height ? ART : CLEAR,
);

describe('outlineSprites', () => {
  it('leaves every drawn pixel of the artwork exactly as it found it', () => {
    // The reason the ring is drawn outside the box rather than on it: the sprite's own edge is the
    // pixel a reader checking the bounds is looking at, and a mark on it replaces what it measures.
    const marked = outlineSprites(SHEET, [BOX]);

    for (let y = BOX.top; y < BOX.top + BOX.height; y += 1) {
      for (let x = BOX.left; x < BOX.left + BOX.width; x += 1) {
        expect(at(marked, x, y)).toEqual(ART);
      }
    }
  });

  it('draws the ring one pixel outside the box, on all four sides', () => {
    const marked = outlineSprites(SHEET, [BOX]);
    const ringed = [3, 4, 5, 6, 7];

    for (const along of ringed) {
      for (const [x, y] of [
        [along, 3],
        [along, 7],
        [3, along],
        [7, along],
      ] as const) {
        expect(at(marked, x, y).a).toBe(FULLY_OPAQUE);
      }
    }
    // And nowhere else: two pixels out is untouched on every side.
    for (const [x, y] of [
      [2, 5],
      [8, 5],
      [5, 2],
      [5, 8],
    ] as const) {
      expect(at(marked, x, y)).toEqual(CLEAR);
    }
  });

  it('alternates the two marker colours along every run, horizontal and vertical alike', () => {
    // A dash rather than a solid line, so the mark separates from artwork of any lightness. Parity
    // on `x + y` is what makes both directions dash — one on `x` alone would draw the verticals
    // solid.
    const marked = outlineSprites(SHEET, [BOX]);

    expect(at(marked, 3, 3)).toEqual(marker(0));
    expect(at(marked, 4, 3)).toEqual(marker(1));
    expect(at(marked, 5, 3)).toEqual(marker(0));
    expect(at(marked, 3, 4)).toEqual(marker(1));
    expect(at(marked, 3, 5)).toEqual(marker(0));
  });

  it('clips the sides that would fall off the sheet, and keeps the ones that fit', () => {
    // A sprite in the very corner: two sides of its ring are off the image entirely, and drawing
    // them must not wrap round to the far edge or throw.
    const corner: SpriteBox = { left: 0, top: 0, width: 2, height: 2, pixels: 4 };
    const sheet = imageFrom(8, 8, (x, y) => (x < 2 && y < 2 ? ART : CLEAR));
    const marked = outlineSprites(sheet, [corner]);

    expect(at(marked, 2, 0).a).toBe(FULLY_OPAQUE);
    expect(at(marked, 0, 2).a).toBe(FULLY_OPAQUE);
    expect(at(marked, 2, 2).a).toBe(FULLY_OPAQUE);

    // **These two are where an unclipped write would actually land**, and naming them is the whole
    // point of the case. A channel array is flat, so `pixelOffset(width, -1, y)` is not out of range
    // — it is `(y * width - 1) * 4`, the *last pixel of the row above*. The ring's `x = -1` column
    // therefore wraps onto (7, 0) and (7, 1) rather than throwing or being dropped, and a typed
    // array swallows the genuinely negative offsets from the `y = -1` row in silence. Asserting on
    // some other empty corner would pass whether the guard existed or not.
    expect(at(marked, 7, 0)).toEqual(CLEAR);
    expect(at(marked, 7, 1)).toEqual(CLEAR);
  });

  it('returns the result untouched where nothing was found', () => {
    const marked = outlineSprites(SHEET, []);

    expect(marked.data).toEqual(SHEET.data);
    expect(marked.data).not.toBe(SHEET.data);
  });

  it('leaves the image it was given alone', () => {
    // Purity, and it is the property the preview depends on: the same `ImageData` is what the other
    // three modes draw and what the Download button writes.
    const before = new Uint8ClampedArray(SHEET.data);
    outlineSprites(SHEET, [BOX]);

    expect(SHEET.data).toEqual(before);
  });

  it('marks a whole-column axis with one tick either side of the ring', () => {
    // The 3-wide box's own middle column. The tick sits just outside the ring, in the lighter of the
    // two marker stops and solid — which is what separates it from the ring's alternating dash.
    const marked = outlineSprites(SHEET, [BOX], [{ box: BOX, axis: 5, confidence: 1, snapped: false }]);

    expect(at(marked, 5, BOX.top - 2)).toEqual(marker(1));
    expect(at(marked, 5, BOX.top + BOX.height + 1)).toEqual(marker(1));
  });

  it('marks a half-pixel axis on both columns it runs between', () => {
    // A sprite an even number of pixels wide has no centre column, so the seam is named by the pair
    // that straddles it rather than by rounding to one side and being half a pixel wrong.
    const marked = outlineSprites(SHEET, [BOX], [{ box: BOX, axis: 4.5, confidence: 1, snapped: false }]);

    expect(at(marked, 4, BOX.top - 2)).toEqual(marker(1));
    expect(at(marked, 5, BOX.top - 2)).toEqual(marker(1));
  });

  it('leaves the artwork alone when it marks an axis, as it does when it marks a box', () => {
    // An axis runs *through* a sprite, so drawing it where it actually falls would replace the very
    // pixels a reader is checking it against. The tick is outside the ring for that reason.
    const marked = outlineSprites(SHEET, [BOX], [{ box: BOX, axis: 5, confidence: 1, snapped: false }]);

    for (let y = BOX.top; y < BOX.top + BOX.height; y += 1) {
      for (let x = BOX.left; x < BOX.left + BOX.width; x += 1) {
        expect(at(marked, x, y)).toEqual(ART);
      }
    }
  });

  it('drops a tick that would fall off the sheet rather than wrapping it', () => {
    const corner: SpriteBox = { left: 0, top: 0, width: 3, height: 3, pixels: 9 };
    const sheet = imageFrom(6, 6, () => CLEAR);

    const marked = outlineSprites(sheet, [corner], [{ box: corner, axis: 1, confidence: 1, snapped: false }]);

    // The tick above the box is off the top edge, so it is not drawn — and it has not reappeared on
    // the last row, which is what an unclipped write into the flat channel array would do.
    expect(at(marked, 1, 5)).toEqual(CLEAR);
    expect(at(marked, 1, corner.top + corner.height + 1)).toEqual(marker(1));
  });
});
