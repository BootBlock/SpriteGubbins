import { PALETTE_LIMITS } from '../../types/output.ts';
import type { RenderStyle } from '../../types/rendering.ts';
import type { RenderStyleTraits } from '../../types/renderStyleTraits.ts';

/**
 * What each render style decides about the outline, lighting and colour-budget lines beside it.
 *
 * Read against each style's line in `RENDER_STYLE_TEXT`, which is what every entry answers to:
 *
 * - **The contour.** The two pixel styles count an edge in pixels. `CEL_SHADED` names "a clean ink
 *   contour" and `HAND_DRAWN_INK` "visible drawn line weight", so each owns its line and the outline
 *   setting only colours it. The rest name no contour, and a line drawn around them is a thin one.
 * - **The shading.** `PAINTED_2D` names "soft blended forms", so a key light over it casts graded
 *   shadow rather than bands. `CEL_SHADED` names "hard-edged shadow steps", `RENDERED_3D` "soft form
 *   shadow" and `LOW_POLY_3D` "flat per-face shading", and a clay render is read by the light — each
 *   is shading that has to fall from a light, so none can be left unlit or evenly lit. A silhouette
 *   has no surface for a light to land on.
 * - **The budget.** `RETRO_PIXEL_ART` names "a small palette", which no colour budget, and no budget of
 *   128 colours, can sit beside. `RESTRAINED_64_COLOR` is first because it is the nearest of the two
 *   left to the budgets taken away.
 *
 * `renderStyleCoherence.test.ts` compiles every combination the studio can reach and rejects the
 * pairs these entries exist to prevent, so an entry loosened here fails there.
 */
export const RENDER_STYLE_TRAITS: Readonly<Record<RenderStyle, RenderStyleTraits>> = {
  PIXEL_ART: { contour: 'PIXEL', shading: 'HARD', paletteLimits: PALETTE_LIMITS },
  RETRO_PIXEL_ART: {
    contour: 'PIXEL',
    shading: 'HARD',
    paletteLimits: ['RESTRAINED_64_COLOR', 'STRICT_32_COLOR'],
  },
  PAINTED_2D: { contour: 'LINE', shading: 'SOFT', paletteLimits: PALETTE_LIMITS },
  CEL_SHADED: { contour: 'OWN_LINE', shading: 'OWN', paletteLimits: PALETTE_LIMITS },
  VECTOR_FLAT: { contour: 'LINE', shading: 'HARD', paletteLimits: PALETTE_LIMITS },
  HAND_DRAWN_INK: { contour: 'OWN_LINE', shading: 'HARD', paletteLimits: PALETTE_LIMITS },
  RENDERED_3D: { contour: 'LINE', shading: 'OWN', paletteLimits: PALETTE_LIMITS },
  LOW_POLY_3D: { contour: 'LINE', shading: 'OWN', paletteLimits: PALETTE_LIMITS },
  // The two validation passes withdraw the outline line, and `validationPass.ts` states what each
  // draws in its place. The clay render keeps its light, which is what its volumes are read by.
  CLAY_RENDER: { contour: null, shading: 'OWN', paletteLimits: PALETTE_LIMITS },
  SILHOUETTE_ONLY: { contour: null, shading: null, paletteLimits: PALETTE_LIMITS },
};
