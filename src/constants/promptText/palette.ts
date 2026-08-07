import type { LightingModel, OutlineStyle, PaletteLimit } from '../../types/output.ts';

/**
 * Colour, edges and light, in the prose the prompt carries.
 *
 * v1 emitted these as `IDENTIFIER (parenthetical)`, which made the generator read an enum name it
 * had to interpret. v2 states the requirement instead — the identifier belongs in the app, not in
 * the prompt.
 */

export const PALETTE_TEXT: Readonly<Record<PaletteLimit, string>> = {
  STRICT_32_COLOR: 'Strict — 16 to 32 colours across the entire sheet',
  RESTRAINED_64_COLOR: 'Restrained — 32 to 64 colours across the entire sheet',
  EXPANDED_ALBEDO: 'Expanded albedo — controlled value bands with richer colour variation',
  UNRESTRICTED: 'Unrestricted — no colour budget to hold to',
};

export const OUTLINE_TEXT: Readonly<Record<OutlineStyle, string>> = {
  DARK_LOCAL_CONTOUR: 'A single-pixel contour in a darker shade of each region’s own colour',
  PURE_BLACK_OUTLINE: 'A crisp single-pixel pure black outer contour',
  OUTLINE_LESS_ALBEDO: 'No outline — forms separate by value and hue contrast alone',
};

export const LIGHTING_TEXT: Readonly<Record<LightingModel, string>> = {
  FLAT_NEUTRAL_ALBEDO:
    'Flat neutral albedo — even illumination with no directional key, so a game engine can light the sprite itself',
  ISOMETRIC_TOP_LEFT: 'A fixed 45° top-left key light with hard shadow bands',
  UNLIT_EMISSIVE_BAKED: 'Unlit flat diffuse, with no directional cast shadow',
};
