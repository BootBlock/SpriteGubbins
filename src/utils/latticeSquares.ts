import { TILE_TOLERANCE } from '../constants/cellLattice.ts';
import type { CellLattice, LatticeCell, LatticeRequest } from '../types/cellLattice.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import type { SheetRegion } from '../types/spriteCell.ts';
import { boundingRegion } from './boundingRegion.ts';
import { lineCentres } from './lineCentres.ts';
import { median } from './median.ts';
import { roundedRegion } from './roundedRegion.ts';

/**
 * A placement sheet's occupied cells with the square each one's pieces are placed against
 * (`LatticeCell.square`), once the tile side is settled — the last step of `cellLattice`.
 *
 * **The side is measured only from the piece that is the tile square**, the veil (`TileRole`
 * `MEASURES`), held to the share the prompt states within `TILE_TOLERANCE`; one that disagrees is a
 * failure naming it, and the side is the stated share where the sheet holds none.
 *
 * **A piece drawn to the whole square is placed against its own box** (`SPANS`), squared to its longer
 * side about its centre, so a halo or a glow a generator drew larger than the veil fills its file rather
 * than reaching past it.
 *
 * **Every other piece is placed against a square of the measured side, centred where the spanning
 * pieces put the squares**: across, where they centre the squares of its column, and down, where they
 * centre those of its row (`lineCentres`), or at the middle of its cell where the sheet holds no
 * spanning piece. A generator lays its squares a few pixels off the middle of the cells the gaps
 * describe — up to seventeen across and twelve down on the first real overlay sheet — and a corner mark
 * placed against the cell's middle landed that far off its corner.
 */
export function latticeSquares(
  boxes: readonly SpriteBox[],
  cellOf: readonly number[],
  regions: ReadonlyMap<number, SheetRegion>,
  request: LatticeRequest,
): CellLattice {
  const joined = new Map<number, SheetRegion>();
  for (const cell of new Set(cellOf)) {
    joined.set(cell, boundingRegion(boxes.filter((_box, index) => cellOf[index] === cell)));
  }
  const cellSide = median([...regions.values()].map((region) => region.width));
  const stated = request.share * cellSide;
  const sides = new Map<number, number>();
  for (const cell of request.tileCells.measuring) {
    const own = joined.get(cell);
    if (own !== undefined) sides.set(cell, Math.min(own.width, own.height));
  }
  const astray = [...sides].filter(([, side]) => Math.abs(side / stated - 1) > TILE_TOLERANCE);
  if (request.placement === 'WITHIN_TILE' && astray.length > 0) {
    const cells = astray.map(([cell]) => cell);
    return {
      kind: 'FAILED',
      reason: `the tile square measures ${String(Math.round(median(astray.map(([, side]) => side))))} drawn pixels across, where the sheet states a tile square of ${String(Math.round(request.share * 100))}% of its ${String(Math.round(cellSide))}-pixel cell, ${String(Math.round(stated))} pixels`,
      boxes: cellOf.flatMap((cell, index) => (cells.includes(cell) ? [index] : [])),
    };
  }
  const side = sides.size === 0 ? stated : median([...sides.values()]);
  if (request.placement === 'WITHIN_CELL') {
    const cells = [...regions.entries()].map(([index, region]) => ({ index, region, square: region }));
    return { kind: 'CELLS', cells: cells.sort((a, b) => a.index - b.index), cellOf, tileSide: null };
  }

  const spanning = new Map<number, SheetRegion>();
  for (const cell of request.tileCells.spanning) {
    const own = joined.get(cell);
    if (own !== undefined) spanning.set(cell, squared(own));
  }
  const { columns } = request;
  const across = lineCentres(
    centres(spanning, (cell) => cell % columns, 'left', 'width'),
    cellSide,
  );
  // Each axis steps by its own pitch: a generated sheet's rows need not be as tall as its cells are wide.
  const down = lineCentres(
    centres(spanning, (cell) => Math.floor(cell / columns), 'top', 'height'),
    median([...regions.values()].map((region) => region.height)),
  );
  const cells: LatticeCell[] = [...regions.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, region]) => {
      const x = across(index % columns) ?? region.left + region.width / 2;
      const y = down(Math.floor(index / columns)) ?? region.top + region.height / 2;
      const square = spanning.get(index) ?? roundedRegion(x - side / 2, y - side / 2, side, side);
      return { index, region, square };
    });
  return { kind: 'CELLS', cells, cellOf, tileSide: side };
}

/** A box squared to its longer side about its centre, so the whole box lies inside it. */
function squared(own: SheetRegion): SheetRegion {
  const long = Math.max(own.width, own.height);
  return roundedRegion(own.left + (own.width - long) / 2, own.top + (own.height - long) / 2, long, long);
}

/** The centres of the spanning squares along one axis, by the column or row each lies in. */
function centres(
  spanning: ReadonlyMap<number, SheetRegion>,
  lineOf: (cell: number) => number,
  start: 'left' | 'top',
  size: 'width' | 'height',
): ReadonlyMap<number, readonly number[]> {
  const byLine = new Map<number, number[]>();
  for (const [cell, square] of spanning) {
    const line = lineOf(cell);
    byLine.set(line, [...(byLine.get(line) ?? []), square[start] + square[size] / 2]);
  }
  return byLine;
}
