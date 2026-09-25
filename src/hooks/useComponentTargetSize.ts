import { useMemo } from 'react';
import { useOutputStore } from '../stores/useOutputStore.ts';
import { useSubjectStore } from '../stores/useSubjectStore.ts';
import type { TargetSize } from '../types/output.ts';
import { componentTargetSize } from '../utils/componentTargetSize.ts';
import { useSheetSubject } from './useSheetSubject.ts';

/**
 * The size of one component on the sheet the studio is showing, or `null` where it states none.
 *
 * **Two panels measure against this, and both have to ask the same question.** The Quantise tab
 * offers it as a grid candidate and the Sprites panel compares against it; the atlas planner checks
 * a texture cell against it. Each once read the raw field, and a sheet of parts states the assembled
 * subject there — so `componentTargetSize` answers instead, which withholds an assembly, and withholds
 * every size under a profile other than `CUSTOM` (issue #405): a stock profile states a scale of its
 * own, and a panel measuring against a size the prompt no longer carries would be checking the art
 * against a figure nobody asked the generator for.
 *
 * Field by field rather than the whole output, which is the rule about selecting a store.
 */
export function useComponentTargetSize(): TargetSize | null {
  const category = useSubjectStore((state) => state.category);
  const subject = useSheetSubject();
  const directionalMode = useOutputStore((state) => state.output.directionalMode);
  const directions = useOutputStore((state) => state.output.directions);
  const sheetIndex = useOutputStore((state) => state.output.sheetIndex);
  const resolutionProfile = useOutputStore((state) => state.output.resolutionProfile);
  const spriteTargetSize = useOutputStore((state) => state.output.spriteTargetSize);

  return useMemo(
    () =>
      componentTargetSize(
        category,
        subject,
        directionalMode,
        directions,
        sheetIndex,
        resolutionProfile,
        spriteTargetSize,
      ),
    [category, subject, directionalMode, directions, sheetIndex, resolutionProfile, spriteTargetSize],
  );
}
