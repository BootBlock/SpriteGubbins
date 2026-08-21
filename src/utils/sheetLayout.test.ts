import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import { scaleBoxes, sheetLayout } from './sheetLayout.ts';

/**
 * Where the frames and the tags come from, which is the design decision this feature turns on.
 *
 * Every case here is one the writer above it cannot express an opinion about: which sprites belong
 * to one row, which axis of a sprite's position survives, and what a sheet with nothing separable
 * on it comes to.
 */

/** A sheet is only read for its size here, so its pixels do not matter. */
const SHEET = imageFrom(20, 12, () => ({ r: 0, g: 0, b: 0, a: 0 }));

function box(left: number, top: number, width: number, height: number): SpriteBox {
  return { left, top, width, height, pixels: width * height };
}

describe('sheetLayout', () => {
  it('makes a sheet with no sprites on it one frame of the whole sheet', () => {
    const layout = sheetLayout(SHEET, []);

    expect([layout.width, layout.height]).toEqual([20, 12]);
    expect(layout.frames).toEqual([{ left: 0, top: 0, width: 20, height: 12, x: 0, y: 0 }]);
    // No tag, rather than one covering the single frame: there is no strip to have found.
    expect(layout.strips).toEqual([]);
  });

  it('groups sprites into rows by vertical overlap, and tags each row', () => {
    const layout = sheetLayout(SHEET, [box(0, 0, 2, 2), box(4, 1, 2, 2), box(0, 8, 2, 2)]);

    expect(layout.strips).toEqual([
      { name: 'Row 1', from: 0, to: 1 },
      { name: 'Row 2', from: 2, to: 2 },
    ]);
  });

  it('keeps a row together through a tall sprite the short ones do not reach', () => {
    // The first and third boxes share no row of their own — 0..1 against 5..6 — and both overlap the
    // tall one between them. Grouping pairwise would make three rows of one; the band is what makes
    // it one row, which is what a figure with its arms up in the middle of a walk cycle looks like.
    const layout = sheetLayout(SHEET, [box(0, 0, 2, 2), box(4, 0, 2, 7), box(8, 5, 2, 2)]);

    expect(layout.strips).toEqual([{ name: 'Row 1', from: 0, to: 2 }]);
    expect(layout.height).toBe(7);
  });

  it('orders the frames of a row left to right, whatever order the boxes arrived in', () => {
    const layout = sheetLayout(SHEET, [box(6, 0, 2, 2), box(0, 1, 2, 2), box(3, 0, 2, 2)]);

    expect(layout.frames.map((frame) => frame.left)).toEqual([0, 3, 6]);
  });

  it('centres a sprite across the canvas and keeps its height within its row', () => {
    const layout = sheetLayout(SHEET, [box(0, 0, 4, 3), box(6, 2, 2, 2)]);

    expect([layout.width, layout.height]).toEqual([4, 4]);
    expect(layout.frames.map((frame) => [frame.x, frame.y])).toEqual([
      [0, 0],
      // Two narrower than the canvas, so one pixel of margin each side; two rows below its row's top.
      [1, 2],
    ]);
  });

  it('measures each row from its own top, not from the sheet', () => {
    // A second row far down the sheet must not push the canvas down with it: its frames are placed
    // against that row's own top, so the canvas only has to be as deep as the deepest row.
    const layout = sheetLayout(SHEET, [box(0, 0, 2, 2), box(0, 9, 2, 3)]);

    expect(layout.height).toBe(3);
    expect(layout.frames.map((frame) => frame.y)).toEqual([0, 0]);
  });
});

describe('scaleBoxes', () => {
  it('hands back the boxes untouched at 1:1', () => {
    const boxes = [box(1, 2, 3, 4)];
    expect(scaleBoxes(boxes, 1)).toBe(boxes);
  });

  it('multiplies every edge, so the boxes describe the magnified sheet', () => {
    // `upscaleNearest` draws each pixel as a block, so the box around the blocks is the box around
    // the pixels, scaled — exact rather than approximate, which is what lets the frames line up.
    expect(scaleBoxes([box(1, 2, 3, 4)], 4)).toEqual([
      { left: 4, top: 8, width: 12, height: 16, pixels: 12 * 16 },
    ]);
  });
});
