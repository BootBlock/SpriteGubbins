import { lightingModelsFor, paletteLimitsFor, RENDER_STYLE_TRAITS } from '../promptText/index.ts';
import { PALETTE_LIMITS } from '../../types/output.ts';
import type { PaletteLimit } from '../../types/output.ts';
import { RENDER_STYLES } from '../../types/rendering.ts';

/**
 * The styles that narrow each control, read from the record that narrows it rather than listed by
 * hand, so a style whose traits change takes the cards in `tooltips.ts` with it (issue #406).
 */
export const OWN_CONTOUR_STYLES = RENDER_STYLES.filter(
  (style) => RENDER_STYLE_TRAITS[style].contour === 'OWN_LINE',
);
export const ONE_LIGHT_STYLES = RENDER_STYLES.filter((style) => lightingModelsFor(style).length === 1);
export const NARROW_BUDGET_STYLES = RENDER_STYLES.filter(
  (style) => paletteLimitsFor(style).length < PALETTE_LIMITS.length,
);

/** The one lighting model the one-light styles take, or `''` if none does. */
export const ONE_LIGHT =
  ONE_LIGHT_STYLES[0] === undefined ? '' : (lightingModelsFor(ONE_LIGHT_STYLES[0])[0] ?? '');

/** The budgets the narrow-budget styles offer, or none if no style narrows them. */
export const NARROW_BUDGET_LIMITS: readonly PaletteLimit[] =
  NARROW_BUDGET_STYLES[0] === undefined ? [] : paletteLimitsFor(NARROW_BUDGET_STYLES[0]);
