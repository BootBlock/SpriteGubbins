import { resolveBackgroundKey } from '../constants/backgroundKeysFor.ts';
import { useOutputStore } from '../stores/useOutputStore.ts';
import type { BackgroundKey } from '../types/rendering.ts';
import { useSheetSubject } from './useSheetSubject.ts';

/**
 * The key the sheet is drawn on: the stored one resolved through the subject and the target
 * (`resolveBackgroundKey`), so the Quantise tab and every other reader outside the compiler key out the
 * colour the prompt states rather than one a tint mask or the target has withdrawn.
 */
export function useResolvedBackgroundKey(): BackgroundKey {
  const backgroundKey = useOutputStore((state) => state.output.backgroundKey);
  const targetModel = useOutputStore((state) => state.output.targetModel);
  return resolveBackgroundKey(useSheetSubject(), targetModel, backgroundKey);
}
