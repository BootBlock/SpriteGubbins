import type { SheetRegion } from '../types/spriteCell.ts';

/**
 * A region from fractional edges, each edge rounded to a whole pixel — so two regions that share an
 * edge still share it once rounded, where rounding a width would open a pixel's gap between them.
 */
export function roundedRegion(left: number, top: number, width: number, height: number): SheetRegion {
  const x = Math.round(left);
  const y = Math.round(top);
  return { left: x, top: y, width: Math.round(left + width) - x, height: Math.round(top + height) - y };
}
