import { describe, expect, it } from 'vitest';
import type { CellLattice, LatticeRequest } from '../types/cellLattice.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import { cellLattice } from './cellLattice.ts';

/**
 * Synthetic overlay sheets: a 1024-pixel sheet of four 256-pixel cells across, each piece drawn inside
 * the tile square, 60% of its cell, at its place on the icon. `drift` stretches each cell by that
 * fraction, row after row and column after column, as a generated sheet's cells drift from the grid its
 * prompt states.
 */
const SIDE = 1024;
const STEP = 256;
const TILE = 0.6;
const BADGE = 30;

type Place = 'TILE' | 'TOP_LEFT' | 'TOP_RIGHT' | 'BOTTOM_LEFT' | 'BOTTOM_RIGHT' | 'CENTRE';

/** Where a cell's tile square sits on a sheet whose cells are `1 + drift` steps each. */
function squareAt(cell: number, drift = 0) {
  const pitch = STEP * (1 + drift);
  const side = Math.round(pitch * TILE);
  const left = Math.round((cell % 4) * pitch + (pitch - side) / 2);
  const top = Math.round(Math.floor(cell / 4) * pitch + (pitch - side) / 2);
  return { left, top, side };
}

/** One piece in a cell, at its place on the tile square. */
function piece(cell: number, place: Place, drift = 0): SpriteBox {
  const { left, top, side } = squareAt(cell, drift);
  if (place === 'TILE') return { left, top, width: side, height: side, pixels: side * side };
  const right = left + side - BADGE;
  const bottom = top + side - BADGE;
  const corner: Record<Exclude<Place, 'TILE'>, readonly [number, number]> = {
    TOP_LEFT: [left, top],
    TOP_RIGHT: [right, top],
    BOTTOM_LEFT: [left, bottom],
    BOTTOM_RIGHT: [right, bottom],
    CENTRE: [left + (side - BADGE) / 2, top + (side - BADGE) / 2],
  };
  const [x, y] = corner[place];
  return { left: Math.round(x), top: Math.round(y), width: BADGE, height: BADGE, pixels: BADGE * BADGE };
}

const REQUEST: LatticeRequest = {
  width: SIDE,
  height: SIDE,
  columns: 4,
  placement: 'WITHIN_TILE',
  share: TILE,
  tileCells: [0, 1, 2, 3, 4, 5],
};

function cells(lattice: CellLattice) {
  if (lattice.kind !== 'CELLS') throw new Error(`expected cells, got: ${lattice.reason}`);
  return lattice;
}

describe('cellLattice', () => {
  it('finds every piece’s cell on a sheet drifting five percent a row, and its square to within two pixels', () => {
    const drift = 0.05;
    const places: Place[] = ['TILE', 'TILE', 'TILE', 'TILE', 'TILE', 'TILE', 'TOP_RIGHT', 'BOTTOM_LEFT'];
    places.push('TOP_LEFT', 'BOTTOM_RIGHT', 'CENTRE', 'TOP_RIGHT', 'BOTTOM_LEFT', 'TOP_LEFT');
    const boxes = places.map((place, cell) => piece(cell, place, drift));
    const lattice = cells(cellLattice(boxes, { ...REQUEST, width: SIDE * (1 + drift) }));
    expect(lattice.cellOf).toEqual(places.map((_place, cell) => cell));
    for (const cell of lattice.cells) {
      const expected = squareAt(cell.index, drift);
      expect(Math.abs(cell.square.left - expected.left), `cell ${String(cell.index)}`).toBeLessThanOrEqual(2);
      expect(Math.abs(cell.square.top - expected.top), `cell ${String(cell.index)}`).toBeLessThanOrEqual(2);
    }
  });

  it('keeps a corner badge in its corner of the square, in all four corners', () => {
    const tiles = [0, 1, 2, 3, 4, 5].map((cell) => piece(cell, 'TILE'));
    const corners: Place[] = ['TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_LEFT', 'BOTTOM_RIGHT'];
    const badges = corners.map((place, at) => piece(6 + at, place));
    const lattice = cells(cellLattice([...tiles, ...badges], REQUEST));
    for (const [at, place] of corners.entries()) {
      const badge = badges[at];
      const square = lattice.cells.find((cell) => cell.index === 6 + at)?.square;
      if (badge === undefined || square === undefined) throw new Error('unreachable');
      const right = square.left + square.width - (badge.left + badge.width);
      const bottom = square.top + square.height - (badge.top + badge.height);
      expect(place.startsWith('TOP') ? badge.top - square.top : bottom, place).toBeLessThanOrEqual(1);
      expect(place.endsWith('LEFT') ? badge.left - square.left : right, place).toBeLessThanOrEqual(1);
    }
  });

  it('puts two pieces of one row in it however little they overlap', () => {
    // A badge at the top of one cell and a mark at the bottom of the next share no height at all.
    const boxes = [piece(0, 'TILE'), piece(4, 'TOP_RIGHT'), piece(5, 'BOTTOM_LEFT')];
    expect(cells(cellLattice(boxes, { ...REQUEST, tileCells: [0] })).cellOf).toEqual([0, 4, 5]);
  });

  it('joins nothing across cells, and names a box straddling a boundary rather than centring it', () => {
    const across: SpriteBox = { left: 40, top: 200, width: 100, height: 120, pixels: 12000 };
    const lattice = cellLattice([piece(0, 'TILE'), piece(1, 'TILE'), across], REQUEST);
    expect(lattice.kind).toBe('FAILED');
    if (lattice.kind === 'FAILED') {
      expect(lattice.boxes).toEqual([2]);
      expect(lattice.reason).toContain('sprite 3 lies across it');
    }
  });

  it('reads a sheet of one row, whose rows have no step to measure', () => {
    const boxes = [piece(0, 'TILE'), piece(1, 'TOP_RIGHT'), piece(2, 'CENTRE')];
    const lattice = cells(cellLattice(boxes, { ...REQUEST, tileCells: [0] }));
    expect(lattice.cellOf).toEqual([0, 1, 2]);
    expect(lattice.cells.map((cell) => cell.region.top)).toEqual([0, 0, 0]);
    expect(lattice.cells.map((cell) => cell.region.height)).toEqual([STEP, STEP, STEP]);
  });

  it('leaves an empty cell’s neighbours their own indices', () => {
    const boxes = [piece(0, 'TILE'), piece(2, 'TOP_LEFT'), piece(3, 'TOP_RIGHT')];
    expect(cells(cellLattice(boxes, { ...REQUEST, tileCells: [0] })).cellOf).toEqual([0, 2, 3]);
  });

  it('measures the tile from the full-tile pieces, and places against each one’s own box', () => {
    const boxes = [piece(0, 'TILE'), piece(1, 'TILE'), piece(6, 'TOP_RIGHT')];
    const lattice = cells(cellLattice(boxes, REQUEST));
    expect(lattice.tileSide).toBe(squareAt(0).side);
    const first = boxes[0];
    expect(lattice.cells[0]?.square).toEqual(
      first === undefined
        ? null
        : { left: first.left, top: first.top, width: first.width, height: first.height },
    );
  });

  it('uses the stated share on a sheet with no full-tile piece', () => {
    const boxes = [piece(0, 'TOP_LEFT'), piece(1, 'BOTTOM_RIGHT'), piece(5, 'CENTRE')];
    const lattice = cells(cellLattice(boxes, { ...REQUEST, tileCells: [] }));
    expect(lattice.tileSide).toBeCloseTo(STEP * TILE);
    expect(lattice.cells[0]?.square.width).toBe(Math.round(STEP * TILE));
  });

  it('refuses a sheet whose full-tile pieces disagree with the stated share, naming them', () => {
    const boxes = [piece(0, 'TILE'), piece(1, 'TILE'), piece(2, 'TOP_LEFT')];
    const lattice = cellLattice(boxes, { ...REQUEST, share: 0.4, tileCells: [0, 1] });
    expect(lattice.kind).toBe('FAILED');
    if (lattice.kind === 'FAILED') {
      expect(lattice.boxes).toEqual([0, 1]);
      expect(lattice.reason).toContain('the full-tile pieces measure 154 drawn pixels across');
    }
  });

  it('places against the cell itself under WITHIN_CELL', () => {
    const lattice = cells(
      cellLattice([piece(0, 'TOP_LEFT'), piece(5, 'TOP_RIGHT')], {
        ...REQUEST,
        placement: 'WITHIN_CELL',
      }),
    );
    expect(lattice.tileSide).toBeNull();
    for (const cell of lattice.cells) expect(cell.square).toEqual(cell.region);
  });

  it('refuses a piece past the grid’s last column', () => {
    // A box past the width the sheet reports: the guard that keeps every cell index inside the grid.
    const past: SpriteBox = { left: 1100, top: 60, width: 30, height: 30, pixels: 900 };
    const tiles = [0, 1, 2, 3].map((cell) => piece(cell, 'TILE'));
    const lattice = cellLattice([...tiles, past], { ...REQUEST, tileCells: [0, 1, 2, 3] });
    expect(lattice.kind).toBe('FAILED');
    if (lattice.kind === 'FAILED') {
      expect(lattice.boxes).toEqual([4]);
      expect(lattice.reason).toBe('sprite 5 lies past the grid’s last column');
    }
  });
});
