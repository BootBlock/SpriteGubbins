import { TILE_TOLERANCE } from '../constants/cellLattice.ts';
import type { CellLattice, LatticeCell, LatticeRequest } from '../types/cellLattice.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import type { SheetRegion } from '../types/spriteCell.ts';
import { median } from './median.ts';
import { roundedRegion } from './roundedRegion.ts';

/**
 * A placement sheet's occupied cells with the square each one's pieces are placed against
 * (`LatticeCell.square`), once the tile side is settled — the last step of `cellLattice`.
 *
 * Under `WITHIN_TILE` the side is the median short side of the joined pieces in the cells the plan puts
 * a full-tile piece in, held to the share the prompt states within {@link TILE_TOLERANCE}, or that share
 * where none of those cells holds a piece. A tile that disagrees is a failure naming its boxes.
 */
export function latticeSquares(
  boxes: readonly SpriteBox[],
  cellOf: readonly number[],
  regions: ReadonlyMap<number, SheetRegion>,
  request: LatticeRequest,
): CellLattice {
  const joined = new Map<number, SheetRegion>();
  for (const [index, box] of boxes.entries()) {
    const cell = cellOf[index] ?? -1;
    joined.set(cell, union(joined.get(cell), box));
  }
  const cellSide = median([...regions.values()].map((region) => region.width));
  const stated = request.share * cellSide;
  const tiles = request.tileCells.filter((cell) => joined.has(cell));
  const measured = tiles.length === 0 ? stated : median(tiles.map((cell) => shortSide(joined.get(cell))));
  if (request.placement === 'WITHIN_TILE' && Math.abs(measured / stated - 1) > TILE_TOLERANCE) {
    const named = cellOf.flatMap((cell, index) => (tiles.includes(cell) ? [index] : []));
    return {
      kind: 'FAILED',
      reason: `the full-tile pieces measure ${String(Math.round(measured))} drawn pixels across, where the sheet states a tile square of ${String(Math.round(request.share * 100))}% of its ${String(Math.round(cellSide))}-pixel cell, ${String(Math.round(stated))} pixels`,
      boxes: named,
    };
  }
  const cells: LatticeCell[] = [...regions.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, region]) => ({
      index,
      region,
      square: squareOf(index, region, joined, tiles, measured, request),
    }));
  return { kind: 'CELLS', cells, cellOf, tileSide: request.placement === 'WITHIN_TILE' ? measured : null };
}

/** The square one cell's pieces are placed against — see {@link LatticeCell.square}. */
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
  if (own !== undefined && tiles.includes(index)) return own;
  return roundedRegion(
    region.left + (region.width - side) / 2,
    region.top + (region.height - side) / 2,
    side,
    side,
  );
}

function union(region: SheetRegion | undefined, box: SpriteBox): SheetRegion {
  if (region === undefined) return { left: box.left, top: box.top, width: box.width, height: box.height };
  const left = Math.min(region.left, box.left);
  const top = Math.min(region.top, box.top);
  const right = Math.max(region.left + region.width, box.left + box.width);
  const bottom = Math.max(region.top + region.height, box.top + box.height);
  return { left, top, width: right - left, height: bottom - top };
}

function shortSide(region: SheetRegion | undefined): number {
  return region === undefined ? 0 : Math.min(region.width, region.height);
}
