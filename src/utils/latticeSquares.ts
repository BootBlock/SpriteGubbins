import { TILE_TOLERANCE } from '../constants/cellLattice.ts';
import type { CellLattice, LatticeCell, LatticeRequest } from '../types/cellLattice.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import type { SheetRegion } from '../types/spriteCell.ts';
import { boundingRegion } from './boundingRegion.ts';
import { median } from './median.ts';
import { roundedRegion } from './roundedRegion.ts';

/**
 * A placement sheet's occupied cells with the square each one's pieces are placed against
 * (`LatticeCell.square`), once the tile side is settled — the last step of `cellLattice`.
 *
 * **Measured only from the pieces that are the tile square** — the cells the plan puts a veil or a halo
 * in (`ComponentEntry.fillsTile`). A ring stands just inside the square's edge and a quarter sweep fills
 * one quadrant of it, so their boxes are not the square, and a cell measured from one placed its piece
 * blown up to fill the file. **Each of those pieces is held to the share the prompt states**, within
 * `TILE_TOLERANCE`, and one that disagrees is a failure naming it; the side is their median, or the
 * stated share where the sheet holds none of them. A veil or a halo is placed against its own box,
 * squared to its longer side about its centre, so a tile drawn a pixel off square still lies wholly in
 * its square; every other piece against a square of that side centred in its cell.
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
  const tiles = request.tileCells.filter((cell) => joined.has(cell));
  const sides = new Map(tiles.map((cell) => [cell, shortSide(joined.get(cell))]));
  const astray = tiles.filter((cell) => Math.abs((sides.get(cell) ?? 0) / stated - 1) > TILE_TOLERANCE);
  if (request.placement === 'WITHIN_TILE' && astray.length > 0) {
    const named = cellOf.flatMap((cell, index) => (astray.includes(cell) ? [index] : []));
    const measured = median(astray.map((cell) => sides.get(cell) ?? 0));
    return {
      kind: 'FAILED',
      reason: `the full-tile pieces measure ${String(Math.round(measured))} drawn pixels across, where the sheet states a tile square of ${String(Math.round(request.share * 100))}% of its ${String(Math.round(cellSide))}-pixel cell, ${String(Math.round(stated))} pixels`,
      boxes: named,
    };
  }
  const side = tiles.length === 0 ? stated : median([...sides.values()]);
  const cells: LatticeCell[] = [...regions.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, region]) => ({
      index,
      region,
      square: squareOf(index, region, joined, tiles, side, request),
    }));
  return { kind: 'CELLS', cells, cellOf, tileSide: request.placement === 'WITHIN_TILE' ? side : null };
}

/** The square one cell's pieces are placed against — see `LatticeCell.square`. */
function squareOf(
  index: number,
  region: SheetRegion,
  joined: ReadonlyMap<number, SheetRegion>,
  tiles: readonly number[],
  side: number,
  request: LatticeRequest,
): SheetRegion {
  if (request.placement === 'WITHIN_CELL') return region;
  const own = joined.get(index);
  if (own !== undefined && tiles.includes(index)) {
    const long = Math.max(own.width, own.height);
    return roundedRegion(own.left + (own.width - long) / 2, own.top + (own.height - long) / 2, long, long);
  }
  return roundedRegion(
    region.left + (region.width - side) / 2,
    region.top + (region.height - side) / 2,
    side,
    side,
  );
}

function shortSide(region: SheetRegion | undefined): number {
  return region === undefined ? 0 : Math.min(region.width, region.height);
}
