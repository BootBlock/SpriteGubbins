import { useMemo } from 'react';
import { useOutputStore } from '../stores/useOutputStore.ts';
import type { Palette } from '../types/palette.ts';
import { pinnedPalette } from '../utils/pinnedPalette.ts';
import { useResolvedPalette } from './useResolvedPalette.ts';

/**
 * The palette in force in the studio, or `null` where none is: `pinnedPalette` asked of the palette the
 * subject can take (`useResolvedPalette`), as the compiler asks it. The Palette control's summary and the
 * colour budget it withdraws both read this, so a tint mask, which is drawn under `FREE`, shows the
 * budget its prompt states. Memoised because a `CUSTOM` palette is a fresh object on every call.
 */
export function usePinnedPalette(): Palette | null {
  const palette = useResolvedPalette();
  const customPalette = useOutputStore((state) => state.output.customPalette);
  return useMemo(() => pinnedPalette({ palette, customPalette }), [palette, customPalette]);
}
