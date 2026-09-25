import type { LightingModel, OutlineStyle, PaletteLimit } from './output.ts';

/**
 * How a render style draws the edge of a form, which decides the words its outline is asked for in.
 *
 * - `PIXEL` counts an edge in pixels, so a contour is one pixel wide.
 * - `LINE` has no pixel to count in, so a contour is a thin line of the style's own medium.
 * - `OWN_LINE` names its contour in its own description — a cel sheet's "clean ink contour", an ink
 *   sheet's "visible drawn line weight" — so the outline setting chooses the colour of that line and
 *   nothing else, and cannot take it away.
 */
export type ContourKind = 'PIXEL' | 'LINE' | 'OWN_LINE';

/**
 * How a render style shades a form, which decides what a key light is said to cast and whether the
 * form may go without one.
 *
 * - `HARD` shades in flat steps, so a key light casts hard shadow bands, and the sheet may equally be
 *   left unlit for an engine to light.
 * - `SOFT` blends, so a key light casts graded shadow rather than bands.
 * - `OWN` names its shading in its own description — shadow steps, form shadow, per-face shading, or
 *   a clay model read by the light — and every one of those needs a light to fall from. So the key
 *   light is the only lighting it takes, and the style decides what that light casts.
 */
export type ShadingKind = 'HARD' | 'SOFT' | 'OWN';

/**
 * What one render style decides about the settings printed beside it in section 2.
 *
 * Section 2 prints the style, the colour budget, the outline and the lighting as separate lines, and
 * each used to be a lookup on its own field — so a painted sheet was asked for "soft blended forms"
 * above "hard shadow bands", and a cel sheet for "a clean ink contour" above "No outline" (issue
 * #406). A style's description is the one statement of how the sheet is drawn, so where it names a
 * contour or a shading, the other lines are resolved against it rather than beside it.
 */
export interface RenderStyleTraits {
  /** How the edge is drawn, or `null` for a validation pass, which withdraws the outline line. */
  readonly contour: ContourKind | null;
  /** How a form is shaded, or `null` for a style with no surface for a light to land on. */
  readonly shading: ShadingKind | null;
  /**
   * The colour budgets the style can be drawn under, with the one a stored budget falls back to
   * first.
   *
   * Every budget for a style that names no colour count of its own. A validation pass keeps all
   * four, because the pass withdraws the budget line from the prompt without changing the colour
   * policy the Quantise tab reduces a sheet to.
   */
  readonly paletteLimits: readonly PaletteLimit[];
}

/**
 * The outline, lighting and colour budget a sheet is actually drawn with, once each has been asked
 * of the render style — see `styleSettingsFor`.
 */
export interface StyleSettings {
  /** The outline in force, or `null` where the style withdraws the outline line. */
  readonly outline: OutlineStyle | null;
  /** The lighting in force, or `null` where the style has no surface to light. */
  readonly lighting: LightingModel | null;
  readonly paletteLimit: PaletteLimit;
}
