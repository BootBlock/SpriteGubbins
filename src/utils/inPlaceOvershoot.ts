import { PLACE_OVERSHOOT } from '../constants/cellLattice.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import type { SheetRegion, SpriteCell } from '../types/spriteCell.ts';
import { inPlacePlacement } from './inPlacePlacement.ts';
import { latticeCellOf } from './latticeCellOf.ts';
import { squareInFile } from './squareInFile.ts';

/**
 * How far one piece kept in place reaches past its tile square and past its file, in file pixels, and
 * the margin either may take before the piece is refused rather than clipped.
 */
export interface InPlaceOvershoot {
  /** The furthest the piece reaches past its square as laid on the file, on any of its four sides. */
  readonly square: number;
  /** The furthest the piece reaches past the file's own edges. */
  readonly file: number;
  /** `PLACE_OVERSHOOT` of the square's side in the file. */
  readonly margin: number;
  /** The square's side in the file. */
  readonly side: number;
}

/**
 * How far a piece reaches past its square and past its file under `IN_PLACE`, or `null` where no cell
 * holds it.
 *
 * **Both, on all four sides**, because neither answers for the other. Where the fit resamples, the
 * square is the file's width and the two agree on a square file. On a sheet with a pixel scale the
 * square is centred in a file of another size (`squareInFile`): measured against the file alone, a piece
 * reaching past its square inside a larger file passed, and against the square alone a piece of a square
 * larger than its file would be clipped unrefused. `outOfPlace` refuses a piece past either by more than
 * the margin, and `oversizeReason` tells the two apart, since one is fixed by re-generating the sheet and
 * the other by raising the cell.
 */
export function inPlaceOvershoot(box: SpriteBox, cell: SpriteCell): InPlaceOvershoot | null {
  const placed = inPlacePlacement(box, cell);
  const square = latticeCellOf(box, cell)?.square;
  if (placed === null || square === undefined) return null;
  const into = squareInFile(square, cell);
  return {
    square: pastRegion(placed, { left: into.x, top: into.y, width: into.side, height: into.side }),
    file: pastRegion(placed, { left: 0, top: 0, width: cell.width, height: cell.height }),
    margin: into.side * PLACE_OVERSHOOT,
    side: into.side,
  };
}

/** The furthest a placed rectangle reaches past a region on any side, or a negative figure inside it. */
function pastRegion(
  placed: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
  region: SheetRegion,
): number {
  return Math.max(
    region.left - placed.x,
    region.top - placed.y,
    placed.x + placed.width - (region.left + region.width),
    placed.y + placed.height - (region.top + region.height),
  );
}
