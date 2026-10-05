import { resolveBackgroundKey } from '../constants/backgroundKeysFor.ts';
import { useOutputStore } from '../stores/useOutputStore.ts';
import type { BackgroundKey } from '../types/rendering.ts';
import { useSheetSubject } from './useSheetSubject.ts';

/**
 * The key the sheet is drawn on: the stored one resolved through the subject (`resolveBackgroundKey`),
 * so the Quantise tab and every other reader outside the compiler key out the colour the prompt states
 * rather than one a tint mask has withdrawn.
 */
export function useResolvedBackgroundKey(): BackgroundKey {
  const backgroundKey = useOutputStore((state) => state.output.backgroundKey);
  return resolveBackgroundKey(useSheetSubject(), backgroundKey);
}
