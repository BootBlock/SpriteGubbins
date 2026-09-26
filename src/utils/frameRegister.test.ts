import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import type { PixelShift, SpriteBox } from '../types/quantiser.ts';
import { coverageMask } from './coverageMask.ts';
import { registerFrame } from './frameRegister.ts';
import { FULLY_OPAQUE, FULLY_TRANSPARENT, pixelOffset } from './imageData.ts';

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

/** The registration as the pass runs it: both boxes packed into masks, then laid over each other. */
function register(sheet: ImageData, reference: SpriteBox, frame: SpriteBox, reach: number): PixelShift {
  return registerFrame(coverageMask(sheet, reference), coverageMask(sheet, frame), reach);
}

/**
 * The same search stated pixel by pixel, with none of the packing — the oracle the packed search is
 * held to. Every candidate reads each opaque reference pixel, shifted, from the image, and counts it
 * only where it lands inside the frame's box on an opaque pixel.
 */
function registerByPixel(
  sheet: ImageData,
  reference: SpriteBox,
  frame: SpriteBox,
  reach: number,
): PixelShift {
  const opaque = (x: number, y: number): boolean =>
    sheet.data[pixelOffset(sheet.width, x, y) + 3] !== FULLY_TRANSPARENT;
  const seedX = frame.left - reference.left;
  const seedY = frame.top - reference.top;
  let best = { x: seedX, y: seedY };
  let bestScore = -1;
  let bestReach = 0;

  for (let stepY = -reach; stepY <= reach; stepY += 1) {
    for (let stepX = -reach; stepX <= reach; stepX += 1) {
      let score = 0;
      for (let y = reference.top; y < reference.top + reference.height; y += 1) {
        for (let x = reference.left; x < reference.left + reference.width; x += 1) {
          const u = x + seedX + stepX;
          const v = y + seedY + stepY;
          if (u < frame.left || u >= frame.left + frame.width) continue;
          if (v < frame.top || v >= frame.top + frame.height) continue;
          if (opaque(x, y) && opaque(u, v)) score += 1;
        }
      }
      const distance = stepX * stepX + stepY * stepY;
      if (score < bestScore || (score === bestScore && distance >= bestReach)) continue;
      best = { x: seedX + stepX, y: seedY + stepY };
      bestScore = score;
      bestReach = distance;
    }
  }

  return best;
}

/** A repeatable stream of numbers in `[0, 1)`, so a scattered drawing is the same on every run. */
function scatter(seed: number): () => number {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

describe('registerFrame', () => {
  it('reads the plain distance between two identical frames', () => {
    const first = { left: 2, top: 2, width: 6, height: 6 };
    const second = { left: 22, top: 2, width: 6, height: 6 };
    const sheet = sheetOf(40, 12, [first, second]);

    expect(register(sheet, boxOf(first), boxOf(second), 8)).toEqual({ x: 20, y: 0 });
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

    expect(register(sheet, reference, frame, 8).x).toBe(18);
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

    expect(register(sheet, boxOf(reference), boxOf({ left: 20, top: 2, width: 4, height: 4 }), 8)).toEqual({
      x: 20,
      y: 0,
    });
  });

  it('answers with the corner difference where the coverage cannot separate two candidates', () => {
    // Two solid blocks: every shift that keeps them overlapping by the same amount scores the same,
    // so nothing about the artwork picks a winner. The seed is what breaks the tie, which is what
    // makes two runs at the same settings agree.
    const reference = { left: 0, top: 0, width: 10, height: 10 };
    const frame = { left: 20, top: 0, width: 10, height: 10 };
    const sheet = sheetOf(40, 10, [reference, frame]);

    expect(register(sheet, boxOf(reference), boxOf(frame), 4)).toEqual({ x: 20, y: 0 });
  });

  it('reads a vertical wander as well as a horizontal one', () => {
    const reference = { left: 2, top: 2, width: 6, height: 6 };
    const frame = { left: 22, top: 5, width: 6, height: 6 };
    const sheet = sheetOf(40, 16, [reference, frame]);

    expect(register(sheet, boxOf(reference), boxOf(frame), 8)).toEqual({ x: 20, y: 3 });
  });

  it('scores every candidate exactly as a pixel-by-pixel count would, across word boundaries', () => {
    // Scattered drawings whose widths are not multiples of the 32 pixels a mask word holds, placed so
    // the shifts carry columns across word boundaries in both directions — the reads a packed search
    // can get wrong while every solid-block case above still passes. Sparse enough that the overlap
    // separates candidates, dense enough that it is not all ties.
    const next = scatter(470);
    const reference = { left: 3, top: 4, width: 37, height: 11, pixels: 0 };
    const frames = [
      { left: 51, top: 6, width: 70, height: 13, pixels: 0 },
      { left: 130, top: 2, width: 33, height: 9, pixels: 0 },
      { left: 170, top: 5, width: 64, height: 12, pixels: 0 },
    ];
    const inked = new Set<number>();
    for (const box of [reference, ...frames]) {
      for (let y = box.top; y < box.top + box.height; y += 1) {
        for (let x = box.left; x < box.left + box.width; x += 1) if (next() < 0.4) inked.add(y * 240 + x);
      }
    }
    const sheet = imageFrom(240, 24, (x, y) => (inked.has(y * 240 + x) ? INK : CLEAR));

    for (const frame of frames) {
      for (const reach of [0, 3, 8]) {
        expect(register(sheet, reference, frame, reach)).toEqual(
          registerByPixel(sheet, reference, frame, reach),
        );
      }
    }
  });
});
