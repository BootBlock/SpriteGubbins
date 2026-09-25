import type { LightingModel } from '../../types/output.ts';
import type { RenderStyle } from '../../types/rendering.ts';
import type { ShadingKind } from '../../types/renderStyleTraits.ts';
import { RENDER_STYLE_TRAITS } from './renderStyleTraits.ts';

const FLAT_NEUTRAL_ALBEDO =
  'Flat neutral albedo — even illumination with no directional key, so a game engine can light the sprite itself';
const UNLIT_EMISSIVE_BAKED = 'Unlit flat diffuse, with no directional cast shadow';

/**
 * The lighting as section 2 states it, in the terms of the way the style shades.
 *
 * **The key light's shadow is the style's, not the light's.** It once said "hard shadow bands" for
 * every style, so a painted sheet asked for "soft blended forms" and a 3D render for "soft form
 * shadow" were each lit into bands in the next line (issue #406).
 *
 * **An `OWN` style takes the key light alone, and says nothing about its shadow.** Its own line names
 * the shading — cel steps, form shadow, flat per-face shading, a clay volume read by the light — and
 * that is shading a light casts, so "even illumination with no directional key" or "unlit flat
 * diffuse" beside it is one prompt asking for shading and forbidding the light it falls from. The
 * sentence states the direction and leaves the shadow's character to the style line above it. The
 * keys of each entry are the lighting models the studio offers for that kind, as `OUTLINE_TEXT`'s are.
 */
export const LIGHTING_TEXT: Readonly<Record<ShadingKind, Readonly<Partial<Record<LightingModel, string>>>>> =
  {
    HARD: {
      FLAT_NEUTRAL_ALBEDO,
      ISOMETRIC_TOP_LEFT: 'A fixed 45° top-left key light with hard shadow bands',
      UNLIT_EMISSIVE_BAKED,
    },
    SOFT: {
      FLAT_NEUTRAL_ALBEDO,
      ISOMETRIC_TOP_LEFT: 'A fixed 45° top-left key light with soft, graded form shadow',
      UNLIT_EMISSIVE_BAKED,
    },
    OWN: {
      ISOMETRIC_TOP_LEFT: 'A fixed 45° top-left key light, the one light every form is shaded by',
    },
  };

/**
 * The lighting line for this render style, given the lighting model it has already been asked about
 * through `styleSettingsFor` — or `''` for a style with no surface to light, whose line the template
 * has dropped by then.
 */
export function lightingDescription(renderStyle: RenderStyle, model: LightingModel | null): string {
  const { shading } = RENDER_STYLE_TRAITS[renderStyle];
  if (shading === null || model === null) return '';
  const text = LIGHTING_TEXT[shading][model];
  if (text === undefined) throw new Error(`${renderStyle} offers no ${model} lighting.`);
  return text;
}
