import { useMemo } from 'react';
import { useOutputStore } from '../stores/useOutputStore.ts';
import { useSubjectStore } from '../stores/useSubjectStore.ts';
import { parseAdditionalAnatomy } from '../utils/additionalAnatomy.ts';
import { componentCountFor } from '../utils/componentSet.ts';
import { useSheetSubject } from './useSheetSubject.ts';

/**
 * How many components this sheet's own prompt contracts for.
 *
 * The figure the Sprites panel holds the segmentation against, and the ceiling the grid suggestion
 * seats. One derivation for both, because two would be two answers to "what did the prompt ask for"
 * on one screen — see `useSuggestedGrid`, which reads it through this hook rather than again.
 */
export function useExpectedComponents(): number {
  const category = useSubjectStore((state) => state.category);
  const additionalAnatomy = useSubjectStore((state) => state.subject.additional_anatomy);
  // The other subject fields the count reads — see `componentSet.ts`.
  const subject = useSheetSubject();
  const directionalMode = useOutputStore((state) => state.output.directionalMode);
  const directions = useOutputStore((state) => state.output.directions);
  const sheetIndex = useOutputStore((state) => state.output.sheetIndex);
  const rigContract = useOutputStore((state) => state.output.rigContract);

  return useMemo(
    () =>
      componentCountFor(
        category,
        subject,
        directionalMode,
        directions,
        sheetIndex,
        parseAdditionalAnatomy(additionalAnatomy),
        rigContract,
      ),
    [category, subject, directionalMode, directions, sheetIndex, additionalAnatomy, rigContract],
  );
}
