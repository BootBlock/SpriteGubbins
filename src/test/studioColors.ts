import type { StudioColorSettings } from '../utils/colorReduction.ts';
import type { CustomPalette } from '../types/customPalette.ts';
import type { PaletteLimit } from '../types/output.ts';
import type { PaletteId } from '../types/palette.ts';
import type { RenderStyle } from '../types/rendering.ts';

/**
 * The studio's colour settings, for a suite that is asking about two of the four.
 *
 * `colorPlanFor` takes all four together because they are one decision, and almost every case
 * written about it is about a palette and a budget with no colours of the reader's own in play, under
 * a style that offers every budget. Spelling `customPalette: null` and a render style out at each of
 * those call sites would bury the setting the case is actually about, so the defaults are here and a
 * suite naming one means it.
 */
export function studioColors(
  palette: PaletteId,
  paletteLimit: PaletteLimit,
  customPalette: CustomPalette | null = null,
  renderStyle: RenderStyle = 'PIXEL_ART',
): StudioColorSettings {
  return { palette, customPalette, paletteLimit, renderStyle };
}
