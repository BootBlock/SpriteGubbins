import type { SheetRegion } from '../types/spriteCell.ts';

/**
 * The smallest region holding every one of these, in the sheet's drawn pixels, or an empty region at
 * the origin for none. One answer for the two readers that join boxes: a piece made of several sprites
 * (`spritePieces`) and a placement sheet's cell holding several fragments (`latticeSquares`).
 */
export function boundingRegion(regions: readonly SheetRegion[]): SheetRegion {
  if (regions.length === 0) return { left: 0, top: 0, width: 0, height: 0 };
  const left = Math.min(...regions.map((region) => region.left));
  const top = Math.min(...regions.map((region) => region.top));
  return {
    left,
    top,
    width: Math.max(...regions.map((region) => region.left + region.width)) - left,
    height: Math.max(...regions.map((region) => region.top + region.height)) - top,
  };
}
