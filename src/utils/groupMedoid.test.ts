import { describe, expect, it } from 'vitest';
import type { Rgba, SpriteBox } from '../types/quantiser.ts';
import { imageFrom } from '../test/images.ts';
import { groupMedoid } from './groupMedoid.ts';
import { FULLY_OPAQUE, FULLY_TRANSPARENT, pixelOffset } from './imageData.ts';

const CLEAR: Rgba = { r: 0, g: 0, b: 0, a: FULLY_TRANSPARENT };
const INK: Rgba = { r: 20, g: 30, b: 40, a: FULLY_OPAQUE };
const FLAW: Rgba = { r: 220, g: 30, b: 30, a: FULLY_OPAQUE };

/** Where each sprite goes: one 4 × 4 block per slot, 10 pixels apart along a row. */
const SIDE = 4;
const PITCH = 10;

/**
 * A row of 4 × 4 ink blocks, the nth carrying `flaws[n]` cells of another colour, with their boxes.
 *
 * The count of flawed cells is the whole of what tells two blocks apart, so the distance between any
 * two of them grows with the difference between their counts — which is what lets a test state the
 * medoid it expects without measuring anything.
 */
function row(flaws: readonly number[]): { image: ImageData; boxes: SpriteBox[] } {
  const image = imageFrom(PITCH * flaws.length, PITCH, () => CLEAR);
  const boxes = flaws.map((count, slot) => {
    const left = slot * PITCH;
    for (let cell = 0; cell < SIDE * SIDE; cell += 1) {
      const at = pixelOffset(image.width, left + (cell % SIDE), Math.floor(cell / SIDE));
      const color = cell < count ? FLAW : INK;
      image.data[at] = color.r;
      image.data[at + 1] = color.g;
      image.data[at + 2] = color.b;
      image.data[at + 3] = color.a;
    }
    return { left, top: 0, width: SIDE, height: SIDE, pixels: SIDE * SIDE };
  });
  return { image, boxes };
}

/** Every member its own byte-identical class, which is what a set of distinct flaw counts is. */
function distinct(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index);
}

describe('groupMedoid', () => {
  it('keeps the first of a pair, which has no majority either way', () => {
    const { image, boxes } = row([1, 0]);

    expect(groupMedoid(image, boxes, [0, 1], distinct(2))).toBe(0);
  });

  it('chooses the middle of a chain rather than either end', () => {
    // Each link is within the tolerance of the next while the ends are twice as far apart, which the
    // grouping allows and which folding onto an end would carry into the far end whole.
    const { image, boxes } = row([0, 2, 4]);

    expect(groupMedoid(image, boxes, [0, 1, 2], distinct(3))).toBe(1);
  });

  it('weights a byte-identical class by how many members it has', () => {
    // Measured as classes alone, the flawed frame and the clean one would tie and keep the flawed
    // first. The clean frame is three members, so it stands for the group.
    const { image, boxes } = row([2, 0, 0, 0]);

    expect(groupMedoid(image, boxes, [0, 1, 2, 3], [0, 1, 1, 1])).toBe(1);
  });

  it('keeps the first member where the flaw is in a later one', () => {
    const { image, boxes } = row([0, 0, 1, 0]);

    expect(groupMedoid(image, boxes, [0, 1, 2, 3], [0, 0, 2, 0])).toBe(0);
  });

  it('chooses by distance where every member differs', () => {
    // No two members are byte-identical, so no class weight decides it. The distance between two
    // blocks is their difference in flawed cells, so the member with the median count is closest
    // to the rest overall: a total of 10 against 11 for the next best.
    const { image, boxes } = row([5, 1, 3, 8, 2]);

    expect(groupMedoid(image, boxes, [0, 1, 2, 3, 4], distinct(5))).toBe(2);
  });

  it('answers with a member of the group it was handed, not of the sheet', () => {
    // A sheet holds other groups; only the members named count toward the consensus.
    const { image, boxes } = row([0, 3, 3, 3, 1]);

    expect(groupMedoid(image, boxes, [0, 4], distinct(5))).toBe(0);
  });
});
