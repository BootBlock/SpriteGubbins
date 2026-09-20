import type { StudioColorSettings } from '../utils/colorReduction.ts';
import type { CustomPalette } from '../types/customPalette.ts';
import type { PaletteLimit } from '../types/output.ts';
import type { PaletteId } from '../types/palette.ts';

/**
 * The studio's colour settings, for a suite that is asking about two of the three.
 *
 * `colorPlanFor` takes all three together because they are one decision, and almost every case
 * written about it is about a palette and a budget with no colours of the reader's own in play.
 * Spelling `customPalette: null` out at each of those call sites would bury the setting the case is
 * actually about, so the default is here and a suite naming it means it.
 */
export function studioColors(
  palette: PaletteId,
  paletteLimit: PaletteLimit,
  customPalette: CustomPalette | null = null,
): StudioColorSettings {
  return { palette, customPalette, paletteLimit };
}
