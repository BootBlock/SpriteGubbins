import { describe, expect, it } from 'vitest';
import { SMALLEST_STRIP_FRAMES } from '../constants/quantiser.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import { spriteStrips } from './spriteStrips.ts';

/** A box at a position, with the pixel count nothing here reads. */
function box(left: number, top: number, width = 6, height = 6): SpriteBox {
  return { left, top, width, height, pixels: width * height };
}

/** A strip stated as the left edges of its frames, which is all any assertion here is about. */
function edges(strips: readonly (readonly SpriteBox[])[]): readonly (readonly number[])[] {
  return strips.map((strip) => strip.map((frame) => frame.left));
}

describe('spriteStrips', () => {
  it('gathers sprites sharing a band into one strip, left to right', () => {
    expect(edges(spriteStrips([box(0, 0), box(20, 0), box(40, 0)]))).toEqual([[0, 20, 40]]);
  });

  it('separates rows that share no band', () => {
    const rows = spriteStrips([box(0, 0), box(20, 0), box(40, 0), box(0, 40), box(20, 40), box(40, 40)]);

    expect(edges(rows)).toEqual([
      [0, 20, 40],
      [0, 20, 40],
    ]);
  });

  it('keeps a taller neighbour in the row where it overlaps by half its own height', () => {
    // A figure with a raised arm: twice as tall as the frames beside it, and plainly on their line.
    // The overlap is 6 of the tall box's 12 rows, which is exactly the half the rule admits.
    expect(edges(spriteStrips([box(0, 0), box(20, 0, 6, 12), box(40, 0)]))).toEqual([[0, 20, 40]]);
  });

  it('refuses a box that only clips the band, however far it reaches past it', () => {
    // One row of overlap out of six. Any-overlap would take this in, and through it every sprite on
    // the row below — which is the failure the half rule exists to stop.
    expect(edges(spriteStrips([box(0, 0), box(20, 0), box(40, 5), box(60, 5), box(80, 5)]))).toEqual([
      [40, 60, 80],
    ]);
  });

  it('narrows the band rather than widening it, so a row cannot walk down the sheet', () => {
    // Each box overlaps the one before it by four of its six rows, and the last shares nothing at
    // all with the first. A band that grew with every member would hold all five; the intersection
    // is what stops the walk at the point the row genuinely ends.
    const rows = spriteStrips([box(0, 0), box(20, 2), box(40, 4), box(60, 6), box(80, 8)]);

    expect(edges(rows)).toEqual([[0, 20, 40]]);
  });

  it('drops a row of two, because a pair fits any pitch by definition', () => {
    expect(SMALLEST_STRIP_FRAMES).toBe(3);
    expect(spriteStrips([box(0, 0), box(20, 0)])).toEqual([]);
  });

  it('sorts a strip left to right whatever order the boxes arrived in', () => {
    // `spriteSegments` returns reading order — topmost first, then leftmost — so two frames on one
    // row a pixel apart vertically arrive out of left-to-right order. A run plays left to right.
    expect(edges(spriteStrips([box(40, 0), box(0, 1), box(20, 2)]))).toEqual([[0, 20, 40]]);
  });

  it('has nothing to say about a sheet with no sprites on it', () => {
    expect(spriteStrips([])).toEqual([]);
  });
});
