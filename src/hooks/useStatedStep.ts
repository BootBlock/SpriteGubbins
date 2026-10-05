import { useMemo } from 'react';
import { sheetPlanFor } from '../constants/sheetPlans/index.ts';
import { useOutputStore } from '../stores/useOutputStore.ts';
import { useQuantiseStore } from '../stores/useQuantiseStore.ts';
import { useSubjectStore } from '../stores/useSubjectStore.ts';
import type { SheetStep } from '../types/spriteCell.ts';
import { useSheetSubject } from './useSheetSubject.ts';

/**
 * The grid step the studio's sheet states for the sheet on the Quantise tab, in that sheet's pixels,
 * or `null` where there is no sheet or the plan states no grid (`SheetPlan.cellGrid`).
 *
 * The sheet's side over the cells each way: an icon sheet states one cell, 1/4 of its width each way,
 * however few icons the even cut leaves on it. `SCALE_SET` reads it on an axis its sprites give no step
 * to measure (`SpriteCell.statedStep`). Read through the studio's sheet in force, which is the sheet the
 * download names its files and lays its pack out by (`useSheetIdentity`).
 */
export function useStatedStep(): SheetStep | null {
  const source = useQuantiseStore((state) => state.source);
  const category = useSubjectStore((state) => state.category);
  const subject = useSheetSubject();
  const directionalMode = useOutputStore((state) => state.output.directionalMode);
  const directions = useOutputStore((state) => state.output.directions);
  const sheetIndex = useOutputStore((state) => state.output.sheetIndex);

  return useMemo(() => {
    const { cellGrid } = sheetPlanFor(category, subject, directionalMode, directions, sheetIndex);
    if (source === null || cellGrid === undefined) return null;
    return { x: source.image.width / cellGrid, y: source.image.height / cellGrid };
  }, [source, category, subject, directionalMode, directions, sheetIndex]);
}
