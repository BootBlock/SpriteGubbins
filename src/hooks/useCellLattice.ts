import { useMemo } from 'react';
import { TILE_SHARE } from '../constants/promptText/tileShare.ts';
import { useOutputStore } from '../stores/useOutputStore.ts';
import type { CellLattice } from '../types/cellLattice.ts';
import type { SpriteSegmentation } from '../types/quantiser.ts';
import { cellLattice } from '../utils/cellLattice.ts';
import { tileCellsOf } from '../utils/tileCellsOf.ts';
import { useSheetPlan } from './useSheetPlan.ts';

/**
 * The cells of the sheet on the Quantise tab, where the studio's sheet is a placement sheet
 * (`SheetPlan.placement`) — an icon set's overlay sheet — or `null` where it is not, or where the sheet
 * did not segment into sprites.
 *
 * Read against the studio's sheet in force, as the names and the stated step are (`useSheetPlan`):
 * the grid the plan declares, where it places its pieces, the tile share section 2 states for the
 * resolution profile in force (`TILE_SHARE`), and the cells the plan puts a full-tile piece in.
 */
export function useCellLattice(sprites: SpriteSegmentation | null): CellLattice | null {
  const plan = useSheetPlan();
  const profile = useOutputStore((state) => state.output.resolutionProfile);

  return useMemo(() => {
    if (sprites?.kind !== 'SEGMENTED' || plan.placement === undefined || plan.cellGrid === undefined) {
      return null;
    }
    return cellLattice(sprites.boxes, {
      width: sprites.width,
      height: sprites.height,
      columns: plan.cellGrid,
      placement: plan.placement,
      share: TILE_SHARE[profile] / 100,
      tileCells: tileCellsOf(plan),
    });
  }, [sprites, plan, profile]);
}
