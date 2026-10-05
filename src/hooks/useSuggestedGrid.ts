import { useMemo } from 'react';
import { useQuantiseStore } from '../stores/useQuantiseStore.ts';
import type { PixelGrid } from '../types/quantiser.ts';
import { seatedCells } from '../utils/seatedCells.ts';
import { targetSizeGrid } from '../utils/targetSizeGrid.ts';
import { useComponentTarget } from './useComponentTarget.ts';
import { useExpectedComponents } from './useExpectedComponents.ts';
import { useSheetPlan } from './useSheetPlan.ts';

/**
 * The scale the studio's target size implies for the sheet on the Quantise tab, or `null` where there
 * is no sheet or no target to imply one.
 *
 * Deliberately **not** folded into the grid the pipeline runs at: it is an upper bound derived from
 * how many components the sheet has to seat, not a measurement of this image, so it is offered to
 * click and never silently preferred. Arithmetic on the sheet's two dimensions and a handful of
 * studio numbers, which is why it is derived where it is read rather than joining the worker's
 * answers in `useQuantiseWork`.
 *
 * **It seats the cells a fixed grid declares, where the plan declares one** (`seatedCells`), as
 * the prompt's own native grid does (`promptFacts`, audit finding T5). An icon sheet states sixteen
 * cells however few icons the even cut leaves on it, so a sheet of two drawn at the prompt's scale was
 * offered a scale as much as six times too coarse when this seated the drawings instead.
 */
export function useSuggestedGrid(): PixelGrid | null {
  const source = useQuantiseStore((state) => state.source);
  const target = useComponentTarget();
  const expected = useExpectedComponents();
  const plan = useSheetPlan();

  return useMemo(
    () =>
      source === null || target === null
        ? null
        : targetSizeGrid(source.image, target, seatedCells(plan, expected)),
    [source, target, plan, expected],
  );
}
