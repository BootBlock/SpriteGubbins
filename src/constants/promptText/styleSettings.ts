import { LIGHTING_MODELS, OUTLINE_STYLES, PALETTE_LIMITS } from '../../types/output.ts';
import type { LightingModel, OutputConfig, OutlineStyle, PaletteLimit } from '../../types/output.ts';
import type { RenderStyle } from '../../types/rendering.ts';
import type { StyleSettings } from '../../types/renderStyleTraits.ts';
import { LIGHTING_TEXT } from './lighting.ts';
import { OUTLINE_TEXT } from './outline.ts';
import { RENDER_STYLE_TRAITS } from './renderStyleTraits.ts';

/**
 * Which outline, lighting and colour budget a render style can be drawn with, and the one a stored
 * value it cannot be drawn with resolves to.
 *
 * **The store keeps what the reader chose, and every reader of it asks here.** A style that cannot
 * be drawn with a stored value does not erase it — the reader who moves to a cel style and back finds
 * the outline they left, which is the promise a validation pass already makes about the settings it
 * withdraws. So the compiler, the studio's controls, its digest and the Quantise tab all read the
 * resolved value, and none of them reads the raw one. `resolveMode` is the same arrangement for a
 * sheet mode the category cannot produce.
 *
 * Each list is in the canonical order of its union. An outline or a lighting model falls back to the
 * first the style offers, which that order makes the app's default wherever the style offers it; a
 * budget falls back to the first entry of the style's own list, which names the nearest.
 */

/** The outlines this style offers, or none for a validation pass, which withdraws the line. */
export function outlinesFor(style: RenderStyle): readonly OutlineStyle[] {
  const { contour } = RENDER_STYLE_TRAITS[style];
  if (contour === null) return [];
  const words = OUTLINE_TEXT[contour];
  return OUTLINE_STYLES.filter((outline) => words[outline] !== undefined);
}

/** The lighting models this style offers, or none for a style with no surface to light. */
export function lightingModelsFor(style: RenderStyle): readonly LightingModel[] {
  const { shading } = RENDER_STYLE_TRAITS[style];
  if (shading === null) return [];
  const words = LIGHTING_TEXT[shading];
  return LIGHTING_MODELS.filter((model) => words[model] !== undefined);
}

/** The colour budgets this style offers. */
export function paletteLimitsFor(style: RenderStyle): readonly PaletteLimit[] {
  const allowed = RENDER_STYLE_TRAITS[style].paletteLimits;
  return PALETTE_LIMITS.filter((limit) => allowed.includes(limit));
}

/** The outline this style is drawn with, or `null` where the style withdraws the line. */
export function resolveOutline(style: RenderStyle, stored: OutlineStyle): OutlineStyle | null {
  const allowed = outlinesFor(style);
  return allowed.includes(stored) ? stored : (allowed[0] ?? null);
}

/** The lighting this style is drawn under, or `null` where it has no surface to light. */
export function resolveLighting(style: RenderStyle, stored: LightingModel): LightingModel | null {
  const allowed = lightingModelsFor(style);
  return allowed.includes(stored) ? stored : (allowed[0] ?? null);
}

/** The colour budget this style is drawn under. Every style offers at least one. */
export function resolvePaletteLimit(style: RenderStyle, stored: PaletteLimit): PaletteLimit {
  const allowed = RENDER_STYLE_TRAITS[style].paletteLimits;
  return allowed.includes(stored) ? stored : (allowed[0] ?? stored);
}

/** The three settings as the sheet is drawn with them, resolved against its render style together. */
export function styleSettingsFor(
  output: Pick<OutputConfig, 'renderStyle' | 'outlineStyle' | 'lightingModel' | 'paletteLimit'>,
): StyleSettings {
  return {
    outline: resolveOutline(output.renderStyle, output.outlineStyle),
    lighting: resolveLighting(output.renderStyle, output.lightingModel),
    paletteLimit: resolvePaletteLimit(output.renderStyle, output.paletteLimit),
  };
}
