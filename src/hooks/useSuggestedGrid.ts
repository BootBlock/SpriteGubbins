import { useMemo } from 'react';
import { useQuantiseStore } from '../stores/useQuantiseStore.ts';
import type { PixelGrid } from '../types/quantiser.ts';
import { targetSizeGrid } from '../utils/targetSizeGrid.ts';
import { useComponentTarget } from './useComponentTarget.ts';
import { useExpectedComponents } from './useExpectedComponents.ts';

/**
 * The scale the studio's target size implies for the sheet on the Quantise tab, or `null` where there
 * is no sheet or no target to imply one.
 *
 * Deliberately **not** folded into the grid the pipeline runs at: it is an upper bound derived from
 * how many components the sheet has to seat, not a measurement of this image, so it is offered to
 * click and never silently preferred. Arithmetic on the sheet's two dimensions and a handful of
 * studio numbers, which is why it is derived where it is read rather than joining the worker's
 * answers in `useQuantiseWork`.
 */
export function useSuggestedGrid(): PixelGrid | null {
  const source = useQuantiseStore((state) => state.source);
  const target = useComponentTarget();
  const expected = useExpectedComponents();

  return useMemo(
    () => (source === null || target === null ? null : targetSizeGrid(source.image, target, expected)),
    [source, target, expected],
  );
}
