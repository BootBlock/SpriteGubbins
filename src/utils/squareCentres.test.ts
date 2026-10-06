import { describe, expect, it } from 'vitest';
import type { SheetRegion } from '../types/spriteCell.ts';
import { squareCentres, type SquareAxis } from './squareCentres.ts';

/** Rows of a four-column sheet, read down: a cell's line is its row. */
const DOWN: SquareAxis = { lineOf: (cell) => Math.floor(cell / 4), start: 'top', size: 'height' };

/** A box in a cell, `top` to `top + height` down; across does not matter to the rows. */
function box(top: number, height: number): SheetRegion {
  return { left: 0, top, width: 10, height };
}

/** Veils filling a 200-pixel square in the first column of rows 0 to 2, centred 300 pixels apart. */
const VEILS = new Map([
  [0, box(50, 200)],
  [4, box(350, 200)],
  [8, box(650, 200)],
]);

describe('squareCentres', () => {
  it('answers a line that holds a spanning piece with its centre, whatever else the line holds', () => {
    const at = squareCentres(VEILS, new Map([...VEILS, [5, box(500, 90)]]), DOWN, 300, 200);
    expect(at(1, 0)).toBe(450);
  });

  it('keeps the line’s guess for a line whose pieces lie inside the square it puts there', () => {
    const at = squareCentres(VEILS, new Map([...VEILS, [12, box(960, 40)]]), DOWN, 300, 200);
    expect(at(3, 0)).toBe(1050);
  });

  it('moves the square the least that holds a line’s pieces drawn off the line', () => {
    // The fourth row was drawn twenty pixels low: its corner mark reaches 1170, twenty past the guess.
    const at = squareCentres(VEILS, new Map([...VEILS, [12, box(1110, 60)]]), DOWN, 300, 200);
    expect(at(3, 0)).toBe(1070);
  });

  it('centres the square on a line’s pieces that reach further apart than its side', () => {
    // Two pieces of the fourth row drawn a little larger than the square, and fifteen pixels low.
    const filled = new Map([...VEILS, [12, box(958, 214)], [13, box(960, 212)]]);
    expect(squareCentres(VEILS, filled, DOWN, 300, 200)(3, 0)).toBe(1065);
  });

  it('holds the cell’s middle where the sheet has no spanning piece at all', () => {
    // A mark drawn at 300, above the square about row 1's middle (350 to 550), moves that square up to
    // hold it; row 2 holds nothing, so its middle stands.
    const at = squareCentres(new Map(), new Map([[4, box(300, 40)]]), DOWN, 300, 200);
    expect([at(1, 450), at(2, 750)]).toEqual([400, 750]);
  });
});
