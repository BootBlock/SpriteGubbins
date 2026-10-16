import { resolvePalette } from '../constants/palettesFor.ts';
import { useOutputStore } from '../stores/useOutputStore.ts';
import type { PaletteId } from '../types/palette.ts';
import { useSheetSubject } from './useSheetSubject.ts';

/**
 * The palette the sheet is drawn under: the stored one resolved through the subject (`resolvePalette`),
 * so a reader outside the compiler names the palette the prompt states rather than one a tint mask has
 * withdrawn.
 */
export function useResolvedPalette(): PaletteId {
  const palette = useOutputStore((state) => state.output.palette);
  return resolvePalette(useSheetSubject(), palette);
}
