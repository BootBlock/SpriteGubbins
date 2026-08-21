import { describe, expect, it } from 'vitest';
import { boxSeparation } from './boxSeparation.ts';

/** A 4 × 4 box with its top-left corner at (left, top), in the exclusive-edge form this takes. */
function box(left: number, top: number): [number, number, number, number] {
  return [left, top, left + 4, top + 4];
}

describe('boxSeparation', () => {
  it('is zero for two boxes that overlap', () => {
    expect(boxSeparation(...box(0, 0), ...box(2, 2))).toBe(0);
  });

  it('is zero for two boxes that sit directly against one another', () => {
    // The right edge is exclusive, so a box at 4 begins in the first column past the one ending at 4
    // — they share no pixel and their contents are adjacent, which is one region to an
    // eight-connected labelling. Nothing may read that as space between them.
    expect(boxSeparation(...box(0, 0), ...box(4, 0))).toBe(0);
  });

  it('counts the clear pixels between two boxes', () => {
    expect(boxSeparation(...box(0, 0), ...box(5, 0))).toBe(1);
    expect(boxSeparation(...box(0, 0), ...box(7, 0))).toBe(3);
  });

  it('measures a diagonal gap the eight-connected way', () => {
    // Three clear pixels across and three down is three away, not four and a bit. Measuring it as a
    // Euclidean distance would put this and the labelling on two definitions of "next to".
    expect(boxSeparation(...box(0, 0), ...box(7, 7))).toBe(3);
  });

  it('takes the larger of the two axes', () => {
    expect(boxSeparation(...box(0, 0), ...box(9, 5))).toBe(5);
    expect(boxSeparation(...box(0, 0), ...box(5, 9))).toBe(5);
  });

  it('is symmetric', () => {
    expect(boxSeparation(...box(0, 0), ...box(9, 5))).toBe(boxSeparation(...box(9, 5), ...box(0, 0)));
  });

  it('measures the gap on the other axis when two boxes overlap on one', () => {
    // They share every column and are separated by rows, so the separation is the row gap — a
    // reader of the horizontal overlap alone would call them touching.
    expect(boxSeparation(...box(0, 0), ...box(0, 6))).toBe(2);
    // And zero once the rows meet, which is the case that decides whether a fold may land there.
    expect(boxSeparation(...box(0, 0), ...box(0, 4))).toBe(0);
  });
});
