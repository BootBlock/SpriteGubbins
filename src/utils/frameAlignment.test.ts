import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import type { PixelShift, SpriteBox } from '../types/quantiser.ts';
import { sheetStrips } from './frameAlignment.ts';
import { FULLY_OPAQUE, FULLY_TRANSPARENT } from './imageData.ts';
import { spriteSegments } from './spriteSegments.ts';

const INK = { r: 20, g: 30, b: 40, a: FULLY_OPAQUE };
const CLEAR = { r: 0, g: 0, b: 0, a: FULLY_TRANSPARENT };

const FRAME_SIDE = 6;
const SHEET_WIDTH = 200;
const SHEET_HEIGHT = 20;

/**
 * A row of solid square frames at the given left edges, each at the given top.
 *
 * Solid squares rather than drawings, because what these cases are about is *where* a frame is
 * rather than what is in it — `frameRegister.test.ts` is where the coverage reading is established.
 */
function rowOf(lefts: readonly number[], tops: readonly number[] = []): ImageData {
  return imageFrom(SHEET_WIDTH, SHEET_HEIGHT, (x, y) =>
    lefts.some((left, index) => {
      const top = tops[index] ?? 4;
      return x >= left && x < left + FRAME_SIDE && y >= top && y < top + FRAME_SIDE;
    })
      ? INK
      : CLEAR,
  );
}

/** The sheet's sprites, as the pipeline hands them to this pass. */
function boxesOf(image: ImageData): readonly SpriteBox[] {
  const found = spriteSegments(image, 1);
  return found.kind === 'SEGMENTED' ? found.boxes : [];
}

/** Each frame's drift, strip by strip — the figure the panel lists. */
function driftsOf(image: ImageData, snapAbove: number | null = null): readonly (readonly PixelShift[])[] {
  return sheetStrips(image, boxesOf(image), snapAbove).map((strip) =>
    strip.frames.map((frame) => frame.drift),
  );
}

/** Which frames of each strip the pass marked for the move. */
function markedIn(image: ImageData, snapAbove: number): readonly (readonly boolean[])[] {
  return sheetStrips(image, boxesOf(image), snapAbove).map((strip) =>
    strip.frames.map((frame) => frame.snapped),
  );
}

describe('sheetStrips', () => {
  it('reports no drift in an evenly spaced row', () => {
    expect(driftsOf(rowOf([10, 30, 50, 70]))).toEqual([
      [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ],
    ]);
  });

  it('names the one frame that wandered, on the axis it wandered along', () => {
    expect(driftsOf(rowOf([10, 30, 53, 70, 90]))).toEqual([
      [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 3, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ],
    ]);

    expect(driftsOf(rowOf([10, 30, 50, 70], [4, 4, 6, 4]))).toEqual([
      [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 2 },
        { x: 0, y: 0 },
      ],
    ]);
  });

  it('has nothing to say about a sheet whose sprites form no row of three', () => {
    expect(sheetStrips(rowOf([10, 30]), boxesOf(rowOf([10, 30])), null)).toEqual([]);
  });

  it('marks nothing while the mode is CHECK, whatever it found', () => {
    expect(markedIn(rowOf([10, 30, 53, 70, 90]), 0)).toEqual([[false, false, true, false, false]]);
    expect(
      sheetStrips(rowOf([10, 30, 53, 70, 90]), boxesOf(rowOf([10, 30, 53, 70, 90])), null).flatMap((strip) =>
        strip.frames.map((frame) => frame.snapped),
      ),
    ).toEqual([false, false, false, false, false]);
  });

  it('leaves a frame inside the tolerance where it is', () => {
    expect(markedIn(rowOf([10, 30, 53, 70, 90]), 3)).toEqual([[false, false, false, false, false]]);
    expect(markedIn(rowOf([10, 30, 53, 70, 90]), 2)).toEqual([[false, false, true, false, false]]);
  });

  it('refuses a move that would bring a frame against its neighbour', () => {
    // The third frame of the row sits two rows high of the rest, and something else on the sheet
    // sits two rows below it. Carrying it down onto its slot would put the two against one another,
    // and the next segmentation would then read them as one larger sprite — so the move is refused
    // and the drift is reported anyway.
    const crowded = imageFrom(SHEET_WIDTH, 24, (x, y) => {
      const frame = (left: number, top: number) =>
        x >= left && x < left + FRAME_SIDE && y >= top && y < top + FRAME_SIDE;
      const row = [10, 30, 70, 90].some((left) => frame(left, 4)) || frame(50, 2);
      return row || frame(50, 10) ? INK : CLEAR;
    });
    const [strip] = sheetStrips(crowded, boxesOf(crowded), 0);

    expect(strip?.frames.map((frame) => frame.drift.y)).toEqual([0, 0, -2, 0, 0]);
    expect(strip?.frames.map((frame) => frame.snapped)).toEqual([false, false, false, false, false]);
  });

  it('refuses a move that would carry a frame off the sheet', () => {
    // The row keeps to a pitch of 20 and its first frame sits three pixels right of where that
    // pitch starts, so its slot is a pixel past the left edge. Nothing can be carried there.
    const overhang = rowOf([2, 19, 39, 59]);
    const [strip] = sheetStrips(overhang, boxesOf(overhang), 0);

    expect(strip?.frames[0]?.drift.x).toBe(3);
    expect(strip?.frames[0]?.snapped).toBe(false);
    expect(strip?.frames.slice(1).map((frame) => frame.snapped)).toEqual([false, false, false]);
  });

  it('carries a slot each frame can be stacked by, whatever the pitch rounds to', () => {
    // 0, 21, 43, 64 is the whole-pixel reading of a row spaced 21⅓ apart. Every frame is on its own
    // slot, and the slots step by the row's own spacing rather than by a rounded copy of it.
    const fractional = rowOf([10, 31, 53, 74]);
    const [strip] = sheetStrips(fractional, boxesOf(fractional), null);

    expect(strip?.frames.map((frame) => frame.drift.x)).toEqual([0, 0, 0, 0]);
    expect(strip?.frames.map((frame) => frame.slot.x)).toEqual([0, 21, 43, 64]);
  });

  it('reads each row of a sheet on its own', () => {
    const twoRows = imageFrom(SHEET_WIDTH, 40, (x, y) => {
      const inRow = (top: number, lefts: readonly number[]) =>
        y >= top && y < top + FRAME_SIDE && lefts.some((left) => x >= left && x < left + FRAME_SIDE);
      return inRow(2, [10, 30, 50]) || inRow(24, [10, 30, 53]) ? INK : CLEAR;
    });

    expect(sheetStrips(twoRows, boxesOf(twoRows), null).map((strip) => strip.frames.length)).toEqual([3, 3]);
    // The first row is even and reports nothing; the second is 20 then 23 apart. Three frames cannot
    // say *which* of them moved — the same row is equally well described as a middle frame a pixel
    // and a half early or a last frame three pixels late — so the fit splits the difference, which
    // is the honest answer rather than a guess dressed as one. The five-frame case above is where a
    // row has enough evidence to name the culprit.
    expect(driftsOf(twoRows)[0]?.map((drift) => drift.x)).toEqual([0, 0, 0]);
    expect(driftsOf(twoRows)[1]?.map((drift) => drift.x)).toEqual([0, -1, 0]);
  });
});
