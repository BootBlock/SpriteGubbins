import { useMemo } from 'react';
import { useOutputStore } from '../stores/useOutputStore.ts';
import { useSubjectStore } from '../stores/useSubjectStore.ts';
import type { TargetSize } from '../types/output.ts';
import { componentTargetSize } from '../utils/componentTargetSize.ts';
import { useSheetSubject } from './useSheetSubject.ts';

/**
 * The studio's target size, read as the size of one component on this sheet, or `null` where the
 * studio states none a component could be held to.
 *
 * Read through `componentTargetSize` rather than parsed here, because everything on the Quantise tab
 * that reads it is per-component and a sheet of parts states the assembled subject instead. Fed the
 * raw field, the grid candidate seats fifteen cells of a whole character rather than of a torso, and
 * the Sprites panel compares the largest piece against a size no piece on the sheet has — so its
 * *within the target* carries whatever slack separates a torso from a whole body, which is a number
 * nothing here knows. `null` withdraws every reader of it, rather than putting a figure in their
 * place: a loaded rig contract does state a size per piece, but the pieces differ, and one number is
 * exactly what these readers cannot be given honestly.
 *
 * A hook rather than a prop handed down from the tab, for the reason `useSheetIdentity` is one: its
 * readers are the guide, the grid panel, the Sprites panel and the download's cell controls, which
 * sit up to five components below `QuantiseTab`, and nothing between them has any part in the studio's
 * configuration. The derivation is pure, so every call agrees; what needs React is only the store
 * reads and the memo.
 */
export function useComponentTarget(): TargetSize | null {
  const category = useSubjectStore((state) => state.category);
  // The other subject fields the plan reads — see `componentSet.ts`.
  const subject = useSheetSubject();
  const directionalMode = useOutputStore((state) => state.output.directionalMode);
  const directions = useOutputStore((state) => state.output.directions);
  const sheetIndex = useOutputStore((state) => state.output.sheetIndex);
  const spriteTargetSize = useOutputStore((state) => state.output.spriteTargetSize);

  return useMemo(
    () => componentTargetSize(category, subject, directionalMode, directions, sheetIndex, spriteTargetSize),
    [category, subject, directionalMode, directions, sheetIndex, spriteTargetSize],
  );
}
