import type { SheetRegion } from '../types/spriteCell.ts';
import { lineCentres } from './lineCentres.ts';

/** One axis of a placement sheet: the line a cell lies in along it, and the edge and extent it reads. */
export interface SquareAxis {
  readonly lineOf: (cell: number) => number;
  readonly start: 'left' | 'top';
  readonly size: 'width' | 'height';
}

/**
 * Where the squares of one axis of a placement sheet are centred, line by line (a column across, a row
 * down), from the box each occupied cell's pieces fill and the cells whose piece is drawn to the whole
 * square.
 *
 * **A line that holds a spanning piece is centred where those pieces are** (`lineCentres`).
 *
 * **A line that holds none is read off the line through those, then held to its own pieces**: moved the
 * least distance that keeps every piece of the line inside a square of `side`, or centred on them where
 * they reach further apart than that. The prompt draws every piece within its square, so the pieces of a
 * line say where its square can be, and the line through the other lines can only guess: a generator's
 * pitch drifts. On `test_sprites/icons_fullbleed.png` the bottom row, which holds no spanning piece, was
 * drawn fifteen pixels below the line through the three above it, and its two pieces, which fill the
 * square, reached twenty-two pixels past the square the line put there. Where the sheet holds no
 * spanning piece at all, the guess held is the middle of the cell, `middle`.
 */
export function squareCentres(
  spanning: ReadonlyMap<number, SheetRegion>,
  filled: ReadonlyMap<number, SheetRegion>,
  axis: SquareAxis,
  step: number,
  side: number,
): (line: number, middle: number) => number {
  const measured = new Map<number, number[]>();
  for (const [cell, own] of spanning) {
    const line = axis.lineOf(cell);
    measured.set(line, [...(measured.get(line) ?? []), own[axis.start] + own[axis.size] / 2]);
  }
  const reach = new Map<number, readonly [number, number]>();
  for (const [cell, own] of filled) {
    const line = axis.lineOf(cell);
    const [from, to] = reach.get(line) ?? [Infinity, -Infinity];
    reach.set(line, [Math.min(from, own[axis.start]), Math.max(to, own[axis.start] + own[axis.size])]);
  }
  const guess = lineCentres(measured, step);
  return (line, middle) => {
    const centre = guess(line) ?? middle;
    const pieces = reach.get(line);
    if (measured.has(line) || pieces === undefined) return centre;
    const [from, to] = pieces;
    if (to - from >= side) return (from + to) / 2;
    return Math.min(Math.max(centre, to - side / 2), from + side / 2);
  };
}
