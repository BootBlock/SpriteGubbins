import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import type { AlignedFrame, SpriteBox, SpriteStrip } from '../types/quantiser.ts';
import { FULLY_OPAQUE, FULLY_TRANSPARENT, alphaAt, pixelOffset, readPixel } from './imageData.ts';
import { onionSkin } from './onionSkin.ts';

const INK = { r: 40, g: 80, b: 160, a: FULLY_OPAQUE };
const CLEAR = { r: 0, g: 0, b: 0, a: FULLY_TRANSPARENT };

const SIDE = 4;
const PITCH = 10;

/** A row of solid `SIDE`-square frames at the given left edges, all on rows 2 to 6. */
function rowOf(lefts: readonly number[]): ImageData {
  return imageFrom(40, 12, (x, y) =>
    y >= 2 && y < 2 + SIDE && lefts.some((left) => x >= left && x < left + SIDE) ? INK : CLEAR,
  );
}

function box(left: number): SpriteBox {
  return { left, top: 2, width: SIDE, height: SIDE, pixels: SIDE * SIDE };
}

/** A strip of frames on a pitch of `PITCH`, each at the drift given. */
function stripOf(lefts: readonly number[], drifts: readonly number[]): SpriteStrip {
  const frames: AlignedFrame[] = lefts.map((left, index) => ({
    box: box(left),
    drift: { x: drifts[index] ?? 0, y: 0 },
    slot: { x: index * PITCH, y: 0 },
    snapped: false,
  }));
  return { frames, pitch: { x: PITCH, y: 0 } };
}

/** The alpha of one pixel of the stack. */
function alphaAtPixel(image: ImageData, x: number, y: number): number {
  return alphaAt(image.data, pixelOffset(image.width, x, y));
}

describe('onionSkin', () => {
  it('stacks a row that holds still into one frame at full coverage', () => {
    const row = rowOf([2, 12, 22]);
    const stacked = onionSkin(row, [stripOf([2, 12, 22], [0, 0, 0])]);

    for (let x = 2; x < 2 + SIDE; x += 1) {
      expect(alphaAtPixel(stacked, x, 3)).toBe(FULLY_OPAQUE);
    }
    // The colour is the frames' own, since all three agree about every pixel.
    expect(readPixel(stacked.data, pixelOffset(stacked.width, 3, 3))).toEqual(INK);
  });

  it('ghosts the part only some frames cover, in proportion to how many', () => {
    // Three frames, one of them a pixel to the right of its slot: the column it vacated is covered
    // by two of the three and the column it reaches into by one.
    const row = rowOf([2, 12, 23]);
    const stacked = onionSkin(row, [stripOf([2, 12, 23], [0, 0, 1])]);

    expect(alphaAtPixel(stacked, 2, 3)).toBe(Math.round((2 * FULLY_OPAQUE) / 3));
    expect(alphaAtPixel(stacked, 6, 3)).toBe(Math.round(FULLY_OPAQUE / 3));
    // And the middle, which every frame covers, is untouched.
    expect(alphaAtPixel(stacked, 4, 3)).toBe(FULLY_OPAQUE);
  });

  it('reads a frame that has already moved where it now is', () => {
    // The reading records the box the frame *was* in and the drift that was taken out of it; the
    // sheet holds the frame at its slot. Reading the recorded box would stack the wrong pixels.
    const settled = rowOf([2, 12, 22]);
    const frames: AlignedFrame[] = [2, 12, 22].map((left, index) => ({
      box: box(index === 2 ? 25 : left),
      drift: { x: index === 2 ? 3 : 0, y: 0 },
      slot: { x: index * PITCH, y: 0 },
      snapped: index === 2,
    }));
    const stacked = onionSkin(settled, [{ frames, pitch: { x: PITCH, y: 0 } }]);

    for (let x = 2; x < 2 + SIDE; x += 1) {
      expect(alphaAtPixel(stacked, x, 3)).toBe(FULLY_OPAQUE);
    }
  });

  it('leaves the rest of the sheet exactly as it arrived', () => {
    const row = rowOf([2, 12, 22]);
    const stacked = onionSkin(row, [stripOf([2, 12, 22], [0, 0, 0])]);

    // The second and third frames still stand where they were drawn.
    expect(readPixel(stacked.data, pixelOffset(stacked.width, 13, 3))).toEqual(INK);
    expect(readPixel(stacked.data, pixelOffset(stacked.width, 23, 3))).toEqual(INK);
    // And the gutter between them is still empty.
    expect(alphaAtPixel(stacked, 9, 3)).toBe(FULLY_TRANSPARENT);
  });

  it('copies the sheet through untouched where there is no strip to stack', () => {
    const row = rowOf([2, 12, 22]);
    const stacked = onionSkin(row, []);

    expect([...stacked.data]).toEqual([...row.data]);
    expect(stacked).not.toBe(row);
  });

  it('leaves the sheet it was handed exactly as it arrived', () => {
    const row = rowOf([2, 12, 23]);
    const before = [...row.data];
    onionSkin(row, [stripOf([2, 12, 23], [0, 0, 1])]);

    expect([...row.data]).toEqual(before);
  });
});
