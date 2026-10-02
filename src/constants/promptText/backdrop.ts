import type { OutlineStyle } from '../../types/output.ts';
import type { RenderStyle } from '../../types/rendering.ts';
import { RENDER_STYLE_SURFACE } from './renderStyleSurface.ts';
import { RENDER_STYLE_TRAITS } from './renderStyleTraits.ts';
import { validationPassFor } from './validationPass.ts';

/**
 * How a full-bleed icon square's backdrop is drawn, in the render style's own surface discipline —
 * the sentence section 0's `[IF:OWN_BACKDROP]` block states (R5 of `docs/todo/icon-catalogue.md`).
 *
 * **Derived from what the style already declares, never a second table of styles.** The block used to
 * say "a backdrop keeps every rule a component keeps" while the icon sheet asked for "a soft field of
 * colour, light and texture", and four styles' own lines forbid exactly that: a silhouette pass is
 * "one solid fill … no light, no shade", a clay pass "one untextured material", flat vector shapes
 * carry "no gradients", and pixel art "no smooth gradients". So the answer is read, in order, from:
 *
 * - **a validation pass** (`validationPassFor`) — one flat field of one other value, and the pass's
 *   single fill or material named as the subject's, so the pass and the square do not claim the same
 *   pixels;
 * - **a pixel contour** (`RENDER_STYLE_TRAITS`) — the subject's own pixel grid, with light changed in
 *   hard bands or ordered dithering;
 * - **a style whose negatives carry `smooth gradients`** (`RENDER_STYLE_SURFACE`) — a flat field or a
 *   few hard-edged bands, which is also what keeps this sentence agreeing with the Stable Diffusion and
 *   Qwen negatives built from the same entry;
 * - **otherwise** a painted or rendered surface, which alone takes soft light and texture.
 *
 * **The outline sentence follows the outline the sheet draws.** A square has an edge as well as a
 * subject, and "outer contour" read over a square names the edge — which is the frame the interface
 * draws. So where section 2 states an outline, the sentence puts it round the subject's silhouette.
 * `outline` is the resolved setting, `null` where the style withdraws the line.
 */
export function backdropDescription(style: RenderStyle, outline: OutlineStyle | null): string {
  const contour =
    outline === null || outline === 'OUTLINE_LESS_ALBEDO'
      ? ''
      : ' The edge treatment section [SEC:STYLE] states is the subject’s outline: it runs round the subject’s own silhouette, and is never drawn along the square’s edge.';
  return `The backdrop is ${BACKDROP_TEXT[backdropSurfaceOf(style)]}.${contour}`;
}

/** The four surfaces a backdrop can take, one per answer {@link backdropSurfaceOf} reads off a style. */
type BackdropSurface = 'FLAT_FIELD' | 'PIXEL_BANDS' | 'HARD_BANDS' | 'SOFT_FIELD';

/**
 * Each backdrop surface as it completes "The backdrop is …". Keyed by surface rather than by style, so
 * a style is never written down a second time here: which surface it takes is derived.
 */
export const BACKDROP_TEXT: Readonly<Record<BackdropSurface, string>> = {
  FLAT_FIELD:
    'one flat field of a single colour, a clear step in value from the subject, with no light, shade, texture or gradient across it; where this render style draws a component in one fill or one material, that fill or material is the subject’s',
  PIXEL_BANDS:
    'drawn on the subject’s own pixel grid, its changes of light made in hard value bands or ordered dithering, never a smooth gradient',
  HARD_BANDS:
    'a flat field of colour, or a few hard-edged bands of it in the style’s own fills, never a smooth gradient',
  SOFT_FIELD: 'a soft field of colour, light and texture, painted in the same medium as the subject',
};

function backdropSurfaceOf(style: RenderStyle): BackdropSurface {
  if (validationPassFor(style) !== null) return 'FLAT_FIELD';
  if (RENDER_STYLE_TRAITS[style].contour === 'PIXEL') return 'PIXEL_BANDS';
  if (RENDER_STYLE_SURFACE[style].negatives.includes('smooth gradients')) return 'HARD_BANDS';
  return 'SOFT_FIELD';
}
