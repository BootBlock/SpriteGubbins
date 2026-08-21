import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import { FULLY_OPAQUE, FULLY_TRANSPARENT } from './imageData.ts';
import { registerFrame } from './frameRegister.ts';

const INK = { r: 20, g: 30, b: 40, a: FULLY_OPAQUE };
const CLEAR = { r: 0, g: 0, b: 0, a: FULLY_TRANSPARENT };

/** A rectangle of coverage, in the inclusive-left, exclusive-right form these tests read in. */
interface Rect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

function covers(rect: Rect, x: number, y: number): boolean {
  return x >= rect.left && x < rect.left + rect.width && y >= rect.top && y < rect.top + rect.height;
}

/** A transparent sheet carrying the given solid rectangles. */
function sheetOf(width: number, height: number, rects: readonly Rect[]): ImageData {
  return imageFrom(width, height, (x, y) => (rects.some((rect) => covers(rect, x, y)) ? INK : CLEAR));
}

/** The tight bounding box of a rectangle, which is what the segmentation would have reported. */
function boxOf(rect: Rect): SpriteBox {
  return { ...rect, pixels: rect.width * rect.height };
}

describe('registerFrame', () => {
  it('reads the plain distance between two identical frames', () => {
    const first = { left: 2, top: 2, width: 6, height: 6 };
    const second = { left: 22, top: 2, width: 6, height: 6 };
    const sheet = sheetOf(40, 12, [first, second]);

    expect(registerFrame(sheet, boxOf(first), boxOf(second), 8)).toEqual({ x: 20, y: 0 });
  });

  it('sees past a pose that reaches further, which the bounding boxes cannot', () => {
    // A body six wide, and a second frame whose arm reaches three pixels to the left of it. The
    // boxes say the frame moved three pixels left; the coverage says the body did not move at all,
    // and the body is where the frame is.
    const body = { left: 20, top: 2, width: 6, height: 8 };
    const sheet = sheetOf(48, 14, [
      { left: 2, top: 2, width: 6, height: 8 },
      body,
      { left: 17, top: 4, width: 3, height: 2 },
    ]);
    const reference = boxOf({ left: 2, top: 2, width: 6, height: 8 });
    // The segmentation reports one box round the body and the arm together.
    const frame = boxOf({ left: 17, top: 2, width: 9, height: 8 });

    expect(registerFrame(sheet, reference, frame, 8).x).toBe(18);
  });

  it('never reads a pixel outside the frame it is registering', () => {
    // The frame is a sparse drawing — a diagonal, four opaque pixels in a box of sixteen — and eight
    // pixels to its right stands a solid neighbour. A search reading the whole sheet would score the
    // seed at 4 and the shift that buries the reference in the neighbour at 16, and would report the
    // neighbour's position as where this frame is. Bounding the reads to the frame's own box is what
    // refuses it, so the sparse-and-correct answer wins.
    //
    // **The sparsity is what makes this case bite.** Two solid frames score the same at the seed as
    // at the neighbour, and the tie-break hands it back to the seed — so the bound could be deleted
    // and nothing would notice.
    const reference = { left: 0, top: 2, width: 4, height: 4 };
    const neighbour = { left: 28, top: 2, width: 8, height: 4 };
    const sheet = imageFrom(48, 10, (x, y) => {
      if (covers(reference, x, y) || covers(neighbour, x, y)) return INK;
      // The frame at [20, 24): its own box, drawn as a diagonal.
      return x >= 20 && x < 24 && y >= 2 && y < 6 && x - 20 === y - 2 ? INK : CLEAR;
    });

    expect(
      registerFrame(sheet, boxOf(reference), boxOf({ left: 20, top: 2, width: 4, height: 4 }), 8),
    ).toEqual({ x: 20, y: 0 });
  });

  it('answers with the corner difference where the coverage cannot separate two candidates', () => {
    // Two solid blocks: every shift that keeps them overlapping by the same amount scores the same,
    // so nothing about the artwork picks a winner. The seed is what breaks the tie, which is what
    // makes two runs at the same settings agree.
    const reference = { left: 0, top: 0, width: 10, height: 10 };
    const frame = { left: 20, top: 0, width: 10, height: 10 };
    const sheet = sheetOf(40, 10, [reference, frame]);

    expect(registerFrame(sheet, boxOf(reference), boxOf(frame), 4)).toEqual({ x: 20, y: 0 });
  });

  it('reads a vertical wander as well as a horizontal one', () => {
    const reference = { left: 2, top: 2, width: 6, height: 6 };
    const frame = { left: 22, top: 5, width: 6, height: 6 };
    const sheet = sheetOf(40, 16, [reference, frame]);

    expect(registerFrame(sheet, boxOf(reference), boxOf(frame), 8)).toEqual({ x: 20, y: 3 });
  });
});
