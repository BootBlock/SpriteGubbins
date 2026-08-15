import type { RenderStyle, RenderStyleSurface } from '../../types/rendering.ts';

/**
 * What each render style lets a target model's wrapper say about the surface.
 *
 * **The defect this record exists to remove:** three wrappers stated the edge and gradient rules as
 * fixed strings — "crisp hard edges" in Flux's leading sentence, `anti-aliased edges, smooth
 * gradients` in Stable Diffusion's negative block, `blurred edges, anti-aliased edges` in Qwen's.
 * Those are the *pixel-art* rules, which the template emits only under
 * `[IF:RENDER_STYLE=PIXEL_ART,RETRO_PIXEL_ART]`, so on the eight other styles the wrapper argued with
 * section 2 of the prompt it was wrapping: a painted sheet asked for "soft blended forms" in section
 * 2 and had blending negatively weighted in the same prompt, and a 3D render asked for "soft form
 * shadow" while `smooth gradients` — which is what that shadow is made of — was weighted against it.
 * On Flux it was worse than a contradiction: the wrapper *leads* the prompt, so the wrong claim
 * about edges was the one statement of the two an open-weight encoder's 512-token window could
 * reach. This is the same shape as the `frame, border` correction in `wrapForMidjourney`, moved to
 * the other axis — a term that does real work for most configurations and fights the sheet's own
 * specification for the rest.
 *
 * **The rule for the negatives, which is what keeps this from being a matter of taste: a term may be
 * negated only where the style's own line in `RENDER_STYLE_TEXT` asserts its absence.** "No
 * gradients" and "flat colour fills" say the sheet has no smooth gradients, so negating them
 * reinforces section 2; "soft blended forms" says the opposite, so nothing about them may be
 * negated at all. `anti-aliased edges` is narrower still and belongs to the two pixel styles alone —
 * every other style is rasterised with anti-aliased boundaries, and a vector or cel-shaded sheet
 * told to avoid them comes back with staircased curves nobody asked for.
 * `renderStyleSurface.test.ts` checks both halves against `RENDER_STYLE_TEXT` rather than against a
 * copy of this list, so a style whose description is reworded takes its negatives with it.
 *
 * **The statement is the positive half, and it is what Flux actually reads.** Section 2's `Style:`
 * line lands around token 1,070 of a compiled prompt, past the ceiling the Flux wrapper is written
 * around, so the wrapper is where this sheet's style has to be stated for that target — which makes
 * the statement a restatement of section 2's own words rather than a second description of the
 * style. Nothing else consumes it today; that is a fact about the other wrappers' channels, not a
 * reason to leave it out of one.
 *
 * The general shape here is the one the per-category exclusion, guard and audit records already
 * have: a fact stated once per value of the thing it varies with, rather than once for the whole
 * app in the wording of whichever value was written first.
 */
export const RENDER_STYLE_SURFACE: Readonly<Record<RenderStyle, RenderStyleSurface>> = {
  // The two styles every one of these terms was written for. `anti-aliased edges` stops here, and
  // the template's own pixel-discipline block is what it agrees with: "No anti-aliasing on
  // silhouette edges, no smooth gradients, no sub-pixel blending".
  PIXEL_ART: {
    statement: 'as high-resolution pixel art, with deliberate pixel placement and hard edges',
    negatives: ['blurred edges', 'anti-aliased edges', 'smooth gradients'],
  },
  RETRO_PIXEL_ART: {
    statement: 'as 8/16-bit era pixel art, with visible chunky pixels and a small palette',
    negatives: ['blurred edges', 'anti-aliased edges', 'smooth gradients'],
  },
  // Soft blending is this style's subject, so the negative channel has nothing to say about the
  // surface — and the whole of what it has to say is said positively.
  PAINTED_2D: {
    statement: 'as digital painting, with soft blended forms and visible brush economy',
    negatives: [],
  },
  CEL_SHADED: {
    statement: 'as cel shading, with flat colour fills, hard-edged shadow steps and a clean ink contour',
    negatives: ['blurred edges', 'smooth gradients'],
  },
  VECTOR_FLAT: {
    statement: 'as flat geometric shapes, with crisp mathematical curves',
    negatives: ['blurred edges', 'smooth gradients'],
  },
  HAND_DRAWN_INK: {
    statement: 'as inked linework, with hatched or flat fills and visible drawn line weight',
    negatives: ['blurred edges', 'smooth gradients'],
  },
  // The style whose section 2 line names a shadow of its own: "material shading and soft form
  // shadow" is a gradient across a form, and it is the sheet's subject rather than the cast shadow
  // section 0 forbids.
  RENDERED_3D: {
    statement: 'as rendered 3D forms, with material shading and soft form shadow',
    negatives: [],
  },
  LOW_POLY_3D: {
    statement: 'as faceted low-polygon forms, with flat per-face shading',
    negatives: ['blurred edges', 'smooth gradients'],
  },
  // A validation pass, and lit: the light falling across one untextured material is the whole of
  // what it is run to judge, so its shading is as much the subject here as it is on a 3D render.
  CLAY_RENDER: {
    statement: 'as an untextured single-material form study, lit to read volume',
    negatives: [],
  },
  SILHOUETTE_ONLY: {
    statement: 'as solid single-colour silhouettes, with no internal detail',
    negatives: ['blurred edges', 'smooth gradients'],
  },
};
