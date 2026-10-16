import { useMemo } from 'react';
import { useQuantiseStore } from '../stores/useQuantiseStore.ts';
import type { SheetStep } from '../types/spriteCell.ts';
import { useSheetPlan } from './useSheetPlan.ts';

/**
 * The grid step the studio's sheet states for the sheet on the Quantise tab, in that sheet's pixels,
 * or `null` where there is no sheet or the plan states no grid (`SheetPlan.cellGrid`).
 *
 * The sheet's width over the cells each way, on both axes, because that is how the prompt states the
 * cell: an icon sheet's is 1/4 of the sheet's width each way, however few icons the even cut leaves on
 * it. `SCALE_SET` reads it on an axis its sprites give no step to measure (`SpriteCell.statedStep`).
 * Read through the studio's sheet in force, which is the sheet the download names its files and lays
 * its pack out by (`useSheetIdentity`).
 */
export function useStatedStep(): SheetStep | null {
  const source = useQuantiseStore((state) => state.source);
  const { cellGrid } = useSheetPlan();

  return useMemo(() => {
    if (source === null || cellGrid === undefined) return null;
    const step = source.image.width / cellGrid;
    return { x: step, y: step };
  }, [source, cellGrid]);
}
