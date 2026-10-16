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
  columns: 4,
  placement: 'WITHIN_TILE',
  share: TILE,
  tileCells: { measuring: [0, 1, 2, 3, 4, 5], spanning: [0, 1, 2, 3, 4, 5] },
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
    expect(
      cells(cellLattice(boxes, { ...REQUEST, tileCells: { measuring: [0], spanning: [0] } })).cellOf,
    ).toEqual([0, 4, 5]);
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
    const lattice = cells(cellLattice(boxes, { ...REQUEST, tileCells: { measuring: [0], spanning: [0] } }));
    expect(lattice.cellOf).toEqual([0, 1, 2]);
    expect(lattice.cells.map((cell) => cell.region.top)).toEqual([0, 0, 0]);
    expect(lattice.cells.map((cell) => cell.region.height)).toEqual([STEP, STEP, STEP]);
  });

  it('leaves an empty cell’s neighbours their own indices', () => {
    const boxes = [piece(0, 'TILE'), piece(2, 'TOP_LEFT'), piece(3, 'TOP_RIGHT')];
    expect(
      cells(cellLattice(boxes, { ...REQUEST, tileCells: { measuring: [0], spanning: [0] } })).cellOf,
    ).toEqual([0, 2, 3]);
  });

  it('measures the tile from the veils, and places each against its own box', () => {
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

  it('places a halo drawn larger than the veil against its own box, and a mark against the veil’s side', () => {
    // A generator draws the pieces round the square's edge a few percent larger than the veil.
    const { left, top, side } = squareAt(1);
    const halo: SpriteBox = { left: left - 8, top: top - 8, width: side + 16, height: side + 16, pixels: 1 };
    const lattice = cells(
      cellLattice([piece(0, 'TILE'), halo, piece(2, 'TOP_LEFT')], {
        ...REQUEST,
        tileCells: { measuring: [0], spanning: [0, 1] },
      }),
    );
    expect(lattice.tileSide).toBe(squareAt(0).side);
    expect(lattice.cells[1]?.square).toEqual({
      left: halo.left,
      top: halo.top,
      width: halo.width,
      height: halo.height,
    });
    expect(lattice.cells[2]?.square.width).toBe(squareAt(0).side);
  });

  it('centres a mark’s square where the spanning pieces put its row and column, not its cell', () => {
    // The squares are drawn twelve pixels right of and below the middle of their cells; the mark in
    // cell 5 has a veil above it in its column and one beside it in its row.
    const shifted = (box: SpriteBox): SpriteBox => ({ ...box, left: box.left + 12, top: box.top + 12 });
    const boxes = [piece(1, 'TILE'), piece(4, 'TILE'), piece(5, 'TOP_LEFT')].map(shifted);
    const lattice = cells(
      cellLattice(boxes, { ...REQUEST, tileCells: { measuring: [1, 4], spanning: [1, 4] } }),
    );
    const mark = boxes[2];
    expect(lattice.cells.find((cell) => cell.index === 5)?.square).toMatchObject({
      left: mark?.left,
      top: mark?.top,
    });
  });

  it('places rows of badges under one row of veils on a sheet drawn twelve pixels off its grid', () => {
    // Only the first row holds a spanning piece, so the squares of the two below are read off the row
    // pitch; the even gap under the veils, at 244, once measured a pitch of 244 and put them 12 and 24
    // pixels too high.
    const offset = (box: SpriteBox): SpriteBox => ({ ...box, left: box.left - 12, top: box.top - 12 });
    const places: [number, Place][] = [
      [0, 'TILE'],
      [1, 'TILE'],
      [4, 'TOP_RIGHT'],
      [5, 'TOP_RIGHT'],
    ];
    places.push([8, 'TOP_RIGHT'], [9, 'TOP_RIGHT']);
    const boxes = places.map(([cell, place]) => offset(piece(cell, place)));
    const lattice = cells(
      cellLattice(boxes, { ...REQUEST, tileCells: { measuring: [0, 1], spanning: [0, 1] } }),
    );
    expect(lattice.cellOf).toEqual(places.map(([cell]) => cell));
    for (const [at, [cell]] of places.entries()) {
      const square = lattice.cells.find((each) => each.index === cell)?.square;
      const expected = squareAt(cell);
      expect(square, `cell ${String(cell)}`).toMatchObject({
        left: expected.left - 12,
        top: expected.top - 12,
      });
      expect(boxes[at]?.top, `cell ${String(cell)}`).toBe(square?.top);
    }
  });

  it('takes a veil drawn 22% over the stated share, and refuses one drawn 30% over', () => {
    // The first real overlay sheet's veil came back 16% over, so a fifth left too little room. A row
    // of pieces the veil's size keeps every boundary at 256, so the cell is the 256 the share is of.
    const row = (ratio: number): SpriteBox[] => {
      const side = Math.round(STEP * TILE * ratio);
      const at = Math.round((STEP - side) / 2);
      return [0, 1, 2, 3].map((cell) => ({
        left: cell * STEP + at,
        top: at,
        width: side,
        height: side,
        pixels: side * side,
      }));
    };
    const request = { ...REQUEST, tileCells: { measuring: [0], spanning: [0] } };
    expect(cellLattice(row(1.22), request).kind).toBe('CELLS');
    expect(cellLattice(row(1.3), request).kind).toBe('FAILED');
  });

  it('uses the stated share on a sheet with no veil', () => {
    const boxes = [piece(0, 'TOP_LEFT'), piece(1, 'BOTTOM_RIGHT'), piece(5, 'CENTRE')];
    const lattice = cells(cellLattice(boxes, { ...REQUEST, tileCells: { measuring: [], spanning: [] } }));
    expect(lattice.tileSide).toBeCloseTo(STEP * TILE);
    expect(lattice.cells[0]?.square.width).toBe(Math.round(STEP * TILE));
  });

  it('refuses a sheet whose veils disagree with the stated share, naming them', () => {
    const boxes = [piece(0, 'TILE'), piece(1, 'TILE'), piece(2, 'TOP_LEFT')];
    const lattice = cellLattice(boxes, {
      ...REQUEST,
      share: 0.4,
      tileCells: { measuring: [0, 1], spanning: [0, 1] },
    });
    expect(lattice.kind).toBe('FAILED');
    if (lattice.kind === 'FAILED') {
      expect(lattice.boxes).toEqual([0, 1]);
      expect(lattice.reason).toContain('the tile square measures 154 drawn pixels across');
    }
  });

  it('refuses a single veil astray of the stated share, however many agree with it', () => {
    // Three veils at the stated share would outvote a fourth drawn at two thirds of it in a median.
    const { left, top } = squareAt(3);
    const astray: SpriteBox = { left, top, width: 100, height: 100, pixels: 10_000 };
    const boxes = [piece(0, 'TILE'), piece(1, 'TILE'), piece(2, 'TILE'), astray];
    const lattice = cellLattice(boxes, {
      ...REQUEST,
      tileCells: { measuring: [0, 1, 2, 3], spanning: [0, 1, 2, 3] },
    });
    expect(lattice.kind).toBe('FAILED');
    if (lattice.kind === 'FAILED') {
      expect(lattice.boxes).toEqual([3]);
      expect(lattice.reason).toContain('the tile square measures 100 drawn pixels across');
    }
  });

  it('places a quarter sweep against the tile square, never against its own box', () => {
    // A quarter sweep fills one quadrant of the square, so it keeps a place of its own.
    const { left, top, side } = squareAt(2);
    const half = Math.round(side / 2);
    const sweep: SpriteBox = { left, top, width: half, height: half, pixels: half * half };
    const lattice = cells(
      cellLattice([piece(0, 'TILE'), piece(1, 'TILE'), sweep], {
        ...REQUEST,
        tileCells: { measuring: [0, 1], spanning: [0, 1] },
      }),
    );
    expect(lattice.cells[2]?.square).toEqual({ left, top, width: side, height: side });
  });

  it('places against a square of the cell’s side under WITHIN_CELL, wherever the gaps put the cells', () => {
    // A wide mark along the top of the icon's place in cell 4 and a badge in the top-left corner of the
    // place in cell 5 leave the gap between them thirteen pixels right of the boundary, so the cells the
    // gaps bound sit off the grid; the squares do not.
    const wide = { ...piece(4, 'TOP_LEFT'), width: 180 };
    const boxes = [
      piece(0, 'TILE'),
      piece(1, 'TILE'),
      { ...wide, pixels: wide.width * wide.height },
      piece(5, 'TOP_LEFT'),
    ];
    const lattice = cells(
      cellLattice(boxes, {
        ...REQUEST,
        placement: 'WITHIN_CELL',
        tileCells: { measuring: [0, 1], spanning: [0, 1] },
      }),
    );
    expect(lattice.tileSide).toBeNull();
    expect(lattice.cells[2]?.region.left).toBe(13);
    for (const cell of lattice.cells) {
      expect(cell.square, `cell ${String(cell.index)}`).toEqual({
        left: (cell.index % 4) * STEP,
        top: Math.floor(cell.index / 4) * STEP,
        width: STEP,
        height: STEP,
      });
    }
  });

  it('refuses a piece past the grid’s last column', () => {
    // A box past the width the sheet reports: the guard that keeps every cell index inside the grid.
    const past: SpriteBox = { left: 1100, top: 60, width: 30, height: 30, pixels: 900 };
    const tiles = [0, 1, 2, 3].map((cell) => piece(cell, 'TILE'));
    const lattice = cellLattice([...tiles, past], {
      ...REQUEST,
      tileCells: { measuring: [0, 1, 2, 3], spanning: [0, 1, 2, 3] },
    });
    expect(lattice.kind).toBe('FAILED');
    if (lattice.kind === 'FAILED') {
      expect(lattice.boxes).toEqual([4]);
      expect(lattice.reason).toBe('sprite 5 lies past the grid’s last column');
    }
  });
});
