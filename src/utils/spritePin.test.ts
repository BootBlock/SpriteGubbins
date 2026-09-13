import { describe, expect, it } from 'vitest';
import type { SpriteBox } from '../types/quantiser.ts';
import { pinnedSprite, samePin, spritePin } from './spritePin.ts';

const box = (left: number, top: number, width = 4, height = 4): SpriteBox => ({
  left,
  top,
  width,
  height,
  pixels: width * height,
});

describe('spritePin', () => {
  it('pins to the centre of the box, floored to a whole pixel', () => {
    expect(spritePin(box(10, 20, 5, 7))).toStrictEqual({ x: 12, y: 23 });
  });

  it('holds a pin still while the box grows around the artwork', () => {
    // The failure this whole design is for: every dial on the tab re-cuts the sheet, and a decision
    // that moved with the box would describe a different sprite afterwards. A key letting one more
    // row of fringe through grows the box on all four sides and leaves the centre where it was.
    const tight = box(10, 10, 8, 8);
    const fringed = box(9, 9, 10, 10);

    expect(spritePin(tight)).toStrictEqual(spritePin(fringed));
  });

  it('gives the same pin for the same box twice', () => {
    expect(samePin(spritePin(box(3, 4)), spritePin(box(3, 4)))).toBe(true);
    expect(samePin(spritePin(box(3, 4)), spritePin(box(3, 5)))).toBe(false);
  });
});

describe('pinnedSprite', () => {
  const boxes = [box(0, 0), box(10, 0), box(0, 10)];

  it('finds the sprite the pin falls inside', () => {
    expect(pinnedSprite(boxes, { x: 11, y: 1 })).toBe(1);
  });

  it('treats the far edge as outside, so two touching boxes claim one pixel each', () => {
    // Half-open on both axes: a box at 0 of width 4 holds columns 0 to 3, and column 4 belongs to
    // whatever starts there. A closed test would make two adjacent sprites both contain the seam.
    expect(pinnedSprite([box(0, 0)], { x: 3, y: 3 })).toBe(0);
    expect(pinnedSprite([box(0, 0)], { x: 4, y: 3 })).toBeNull();
  });

  it('answers null rather than guessing when the artwork has gone', () => {
    // The decision this returns null for is dropped and counted, never handed to the nearest box —
    // which is how a reader who fixed one wrong name would end up with a different wrong name.
    expect(pinnedSprite(boxes, { x: 50, y: 50 })).toBeNull();
  });

  it('takes the first containing box in reading order where two overlap', () => {
    // The gap merge produces bounding boxes, so one sprite's box can reach across another's. First
    // in reading order is the tie-break the rest of the app takes.
    const overlapping = [box(0, 0, 20, 20), box(4, 4, 4, 4)];

    expect(pinnedSprite(overlapping, { x: 5, y: 5 })).toBe(0);
  });
});
