import type { SheetPlan } from '../../types/components.ts';

/**
 * Whether section 2's resolution profile line states this sheet's one square at an exact share of its
 * cell (`TILE_SHARE`): a sheet drawing every component to one square, in a fixed grid of cells — an ICON
 * set's icon and overlay sheets.
 *
 * One answer for the line that states the share (`resolutionProfileDescription`) and the hand-off that
 * protects it (`wrapForSol`), so Sol is told to keep the figure on exactly the sheets that carry one.
 */
export function statesTileShare(fit: SheetPlan['fit'], cellGrid: SheetPlan['cellGrid']): boolean {
  return fit === 'SAME_SQUARE' && cellGrid !== undefined;
}
