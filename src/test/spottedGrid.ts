import type { Rgba } from '../types/quantiser.ts';
import { imageFrom } from './images.ts';

/**
 * Crisp art ten cells a side, with one stray pixel in each of the cells the caller names.
 *
 * Test-only, and shared because two questions are asked of this sheet and have to be asked of the
 * same one. The exact detector asks whether the strays still leave nine tenths of the transitions on
 * the lattice; the mesh asks whether it still cuts on that lattice once the strays outweigh the
 * boundaries. Each cell's red rises by 2 across the sheet and by 20 down it, and a stray is 210 away in
 * green — so by count the lattice holds nearly all of the change, while by magnitude the strays hold
 * most of it, which is the disagreement between the two readings issue #276 was about.
 *
 * At the default grid of 4 with no inset, the lattice contributes 720 transitions — nine interior
 * boundaries each way, forty pixels long — and a stray at (1, 1) adds exactly four that miss it: two
 * columns and two rows, at the pixel and again where it ends. So the score is
 * `720 / (720 + 4 × strays)`, which is what makes the threshold testable to the pixel.
 */
export interface SpottedGrid {
  /** The scale the art is drawn at. Defaults to 4. */
  readonly grid?: number;
  /** A margin this many pixels wide on every side, in a colour no cell uses. Defaults to none. */
  readonly inset?: number;
  /** Where the stray sits inside its cell. Defaults to one pixel in from the cell's corner each way. */
  readonly stray?: { readonly x: number; readonly y: number };
  /** Whether the cell at this index — ten to a row, from the top left — carries a stray. */
  readonly spoils: (cell: number) => boolean;
}

/** Cells to a side. */
const CELLS = 10;

const MARGIN: Rgba = { r: 250, g: 0, b: 250, a: 255 };

/** The sheet {@link SpottedGrid} describes. */
export function spottedGrid({ grid = 4, inset = 0, stray = { x: 1, y: 1 }, spoils }: SpottedGrid): ImageData {
  const art = CELLS * grid;
  return imageFrom(art + 2 * inset, art + 2 * inset, (x, y) => {
    const artX = x - inset;
    const artY = y - inset;
    if (artX < 0 || artY < 0 || artX >= art || artY >= art) return MARGIN;
    const cell = Math.floor(artY / grid) * CELLS + Math.floor(artX / grid);
    const spoiled = spoils(cell) && artX % grid === stray.x && artY % grid === stray.y;
    return { r: (cell * 2 + 1) % 256, g: spoiled ? 250 : 40, b: 100, a: 255 };
  });
}

/** The first `count` cells in reading order, the cells along the sheet's edge included. */
export function leadingCells(count: number): (cell: number) => boolean {
  return (cell) => cell < count;
}

/** The first `count` of the sixty-four cells with no side on the sheet's edge, in reading order. */
export function interiorCells(count: number): (cell: number) => boolean {
  const interior: number[] = [];
  for (let row = 1; row < CELLS - 1; row += 1) {
    for (let column = 1; column < CELLS - 1; column += 1) interior.push(row * CELLS + column);
  }
  const chosen = new Set(interior.slice(0, count));
  return (cell) => chosen.has(cell);
}
