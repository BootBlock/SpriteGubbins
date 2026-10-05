import { useMemo } from 'react';
import { sheetPlanFor } from '../constants/sheetPlans/index.ts';
import { useOutputStore } from '../stores/useOutputStore.ts';
import { useSubjectStore } from '../stores/useSubjectStore.ts';
import type { SheetPlan } from '../types/components.ts';
import { useSheetSubject } from './useSheetSubject.ts';

/**
 * The sheet plan the studio is composing, read from the stores in one place.
 *
 * The Quantise tab reads it twice — the grid it suggests seats the plan's cells (`useSuggestedGrid`)
 * and a resizing fit reads the step the plan states (`useStatedStep`) — and the two must not be able
 * to disagree about which sheet that is, for the reason `useSheetIdentity` gives.
 */
export function useSheetPlan(): SheetPlan {
  const category = useSubjectStore((state) => state.category);
  const subject = useSheetSubject();
  const directionalMode = useOutputStore((state) => state.output.directionalMode);
  const directions = useOutputStore((state) => state.output.directions);
  const sheetIndex = useOutputStore((state) => state.output.sheetIndex);

  return useMemo(
    () => sheetPlanFor(category, subject, directionalMode, directions, sheetIndex),
    [category, subject, directionalMode, directions, sheetIndex],
  );
}
