import type { RenderStyle } from '../../types/rendering.ts';
import type { ResolutionProfile, SurfaceDetail } from '../../types/output.ts';

/**
 * How the sheet is drawn, in the prose the prompt carries.
 *
 * These strings are the contract handed to the generator, not UI copy — editing one changes the
 * artwork that comes back. The render-style wording is taken verbatim from
 * `docs/todo/baseline-prompt-new.md` §2, because paraphrasing it changes the output.
 */
export const RENDER_STYLE_TEXT: Readonly<Record<RenderStyle, string>> = {
  PIXEL_ART:
    'Modern high-resolution pixel art. Deliberate pixel placement, hard edges, controlled value bands',
  RETRO_PIXEL_ART: 'Constrained 8/16-bit era pixel art with a small palette and visible chunky pixels',
  PAINTED_2D: 'Digitally painted with soft blended forms and visible brush economy',
  CEL_SHADED: 'Flat colour fills with hard-edged shadow steps and a clean ink contour',
  VECTOR_FLAT: 'Flat geometric shapes, no gradients, crisp mathematical curves',
  HAND_DRAWN_INK: 'Inked linework with hatched or flat fills, visible drawn line weight',
  RENDERED_3D: 'Rendered 3D forms with material shading and soft form shadow',
  LOW_POLY_3D: 'Faceted low-polygon forms with flat per-face shading',
  CLAY_RENDER:
    'Untextured single-material form study. Useful for validating silhouette and volume before committing to colour',
  SILHOUETTE_ONLY:
    'Solid single-colour silhouettes. A readability pass — does the shape read at target size with no internal detail?',
};

export const SURFACE_DETAIL_TEXT: Readonly<Record<SurfaceDetail, string>> = {
  MINIMAL: 'Minimal — base colour blocking and essential joints only',
  CLEAN_PRODUCTION: 'Clean production — major panels and folds, nothing finer',
  DETAILED_PRODUCTION: 'Detailed production — seams and material divisions resolved',
  TEXTURED: 'Textured — controlled surface texturing, still inside the palette limit',
};

/**
 * The scale the components are drawn at.
 *
 * Stated in prose because v1 interpolated the identifier raw, so the prompt read
 * "Selected profile: `HIGH_RESOLUTION_PIXEL_ART`" — a token the model had to guess the meaning of.
 */
export const RESOLUTION_PROFILE_TEXT: Readonly<Record<ResolutionProfile, string>> = {
  HIGH_RESOLUTION: 'High resolution — a full figure occupies 25–35% of the sheet height',
  MID_RESOLUTION: 'Mid resolution — a full figure occupies 18–25% of the sheet height',
  RETRO_16_BIT: '16-bit retro scale — a full figure is roughly 64–96 pixels tall',
  CUSTOM: 'Custom — work to the target component size where one is stated, and to the sheet aspect otherwise',
};

/**
 * The smallest feature the pixel-discipline section permits, per resolution profile.
 *
 * v1 stated a flat `2×2` across every profile, which is wrong at both ends: at high resolution a
 * two-pixel minimum is small enough to read as noise, and at 16-bit scale it forbids the
 * single-pixel detail that style is made of. The minimum therefore scales with the canvas.
 */
export const MIN_FEATURE_SIZE: Readonly<Record<ResolutionProfile, string>> = {
  HIGH_RESOLUTION: '3 × 3',
  MID_RESOLUTION: '2 × 2',
  RETRO_16_BIT: '1 × 1',
  CUSTOM: '2 × 2',
};
