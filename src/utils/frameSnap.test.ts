import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import type { AlignedFrame, SpriteBox, SpriteStrip } from '../types/quantiser.ts';
import { snapFrames } from './frameSnap.ts';
import { FULLY_OPAQUE, FULLY_TRANSPARENT, alphaAt, pixelOffset, readPixel } from './imageData.ts';

const INK = { r: 20, g: 30, b: 40, a: FULLY_OPAQUE };
const TRIM = { r: 200, g: 180, b: 40, a: FULLY_OPAQUE };
const CLEAR = { r: 0, g: 0, b: 0, a: FULLY_TRANSPARENT };

/** A sheet holding one 4 × 4 frame at `left`, with a single trim pixel in its top-left corner. */
function sheetWith(left: number, top = 2): ImageData {
  return imageFrom(24, 12, (x, y) => {
    if (x < left || x >= left + 4 || y < top || y >= top + 4) return CLEAR;
    return x === left && y === top ? TRIM : INK;
  });
}

function box(left: number, top: number): SpriteBox {
  return { left, top, width: 4, height: 4, pixels: 16 };
}

/** One strip of one frame, marked or not, which is all these cases need. */
function stripOf(frame: AlignedFrame): SpriteStrip {
  return { frames: [frame], pitch: { x: 0, y: 0 } };
}

/** Which pixels of the sheet carry any coverage at all, as `x,y` strings. */
function covered(image: ImageData): readonly string[] {
  const found: string[] = [];
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (alphaAt(image.data, pixelOffset(image.width, x, y)) !== FULLY_TRANSPARENT) {
        found.push(`${String(x)},${String(y)}`);
      }
    }
  }
  return found;
}

describe('snapFrames', () => {
  it('carries a marked frame onto its slot, artwork and all', () => {
    const sheet = sheetWith(9);
    const moved = snapFrames(sheet, [
      stripOf({ box: box(9, 2), drift: { x: 3, y: 0 }, slot: { x: 0, y: 0 }, snapped: true }),
    ]);

    expect(moved.moved).toBe(1);
    expect(covered(moved.image)).toEqual(covered(sheetWith(6)));
    // The trim pixel travelled with the rest of it: a move is not a redraw.
    expect(readPixel(moved.image.data, pixelOffset(moved.image.width, 6, 2))).toEqual(TRIM);
  });

  it('empties the box the frame left, so the sheet does not keep two of it', () => {
    const sheet = sheetWith(9);
    const moved = snapFrames(sheet, [
      stripOf({ box: box(9, 2), drift: { x: -4, y: 0 }, slot: { x: 0, y: 0 }, snapped: true }),
    ]);

    // Moved clear of where it was, so every column it vacated is empty.
    expect(covered(moved.image)).toEqual(covered(sheetWith(13)));
  });

  it('moves on both axes at once', () => {
    const sheet = sheetWith(9, 2);
    const moved = snapFrames(sheet, [
      stripOf({ box: box(9, 2), drift: { x: 2, y: -3 }, slot: { x: 0, y: 0 }, snapped: true }),
    ]);

    expect(covered(moved.image)).toEqual(covered(sheetWith(7, 5)));
  });

  it('hands back the very sheet it was given where nothing is marked', () => {
    const sheet = sheetWith(9);
    const read = snapFrames(sheet, [
      stripOf({ box: box(9, 2), drift: { x: 3, y: 0 }, slot: { x: 0, y: 0 }, snapped: false }),
    ]);

    // By reference, which is what lets `quantiseImage` reuse the segmentation it already took rather
    // than labelling the sheet a second time to arrive at the same boxes.
    expect(read.image).toBe(sheet);
    expect(read.moved).toBe(0);
  });

  it('leaves the sheet it was handed exactly as it arrived', () => {
    const sheet = sheetWith(9);
    const before = [...sheet.data];
    snapFrames(sheet, [
      stripOf({ box: box(9, 2), drift: { x: 3, y: 0 }, slot: { x: 0, y: 0 }, snapped: true }),
    ]);

    expect([...sheet.data]).toEqual(before);
  });

  it('clears every frame before writing any of them, so two moves cannot erase each other', () => {
    // Two frames swapping places: each one's box is where the other is going. Cleared and written a
    // frame at a time, the second frame's clear would wipe out what the first had just landed.
    // `sheetStrips` would refuse a pair this tight before it ever got here — this is the ordering
    // being asserted, not a sheet the pass would produce.
    const pair = imageFrom(24, 12, (x, y) => {
      if (y < 2 || y >= 6) return CLEAR;
      if (x >= 2 && x < 6) return INK;
      if (x >= 10 && x < 14) return TRIM;
      return CLEAR;
    });
    const moved = snapFrames(pair, [
      {
        frames: [
          { box: box(2, 2), drift: { x: -8, y: 0 }, slot: { x: 0, y: 0 }, snapped: true },
          { box: box(10, 2), drift: { x: 8, y: 0 }, slot: { x: 8, y: 0 }, snapped: true },
        ],
        pitch: { x: 8, y: 0 },
      },
    ]);

    expect(moved.moved).toBe(2);
    expect(readPixel(moved.image.data, pixelOffset(moved.image.width, 11, 3))).toEqual(INK);
    expect(readPixel(moved.image.data, pixelOffset(moved.image.width, 3, 3))).toEqual(TRIM);
  });
});
