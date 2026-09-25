import type { OutputConfig, SurfaceDetail } from '../../types/output.ts';
import { RENDER_STYLE_TRAITS } from './renderStyleTraits.ts';
import { resolvePaletteLimit } from './styleSettings.ts';

/** How much internal detail the sheet carries, in the prose the prompt carries. */
export const SURFACE_DETAIL_TEXT: Readonly<Record<SurfaceDetail, string>> = {
  MINIMAL: 'Minimal — base colour blocking and essential joints only',
  CLEAN_PRODUCTION: 'Clean production — major panels and folds, nothing finer',
  DETAILED_PRODUCTION: 'Detailed production — seams and material divisions resolved',
  TEXTURED: 'Textured — controlled surface texturing',
};

/**
 * `TEXTURED` on a style drawn in pixels.
 *
 * The pixel-discipline block forbids microtexture — "no scratches, etched strokes, fabric weave,
 * pores, grain" — and says materials read through colour and value blocking, so "controlled surface
 * texturing" a few lines above it asked for what that block forbids. Texture on a pixel sheet is
 * made of the deliberate clusters the same block asks every form to be built from (issue #406).
 */
const PIXEL_TEXTURED_TEXT =
  'Textured — material texture built from deliberate pixel clusters rather than microtexture';

/** The clause `TEXTURED` carries where the sheet has a colour limit to stay inside. */
const INSIDE_THE_LIMIT = ', still inside the palette limit';

/**
 * The surface-detail line, given the configuration it sits in and whether a palette is pinned.
 *
 * **The limit clause is dropped where there is no limit.** It was fixed wording, so a sheet with no
 * pinned palette and an `UNRESTRICTED` budget read "still inside the palette limit" two lines above
 * "no colour budget to hold to". A pinned palette is a limit the texture has to stay inside too, and
 * the budget is the one the render style lets the sheet be drawn under, which the budget line states.
 */
export function surfaceDetailDescription(
  output: Pick<OutputConfig, 'surfaceDetail' | 'renderStyle' | 'paletteLimit'>,
  pinned: boolean,
): string {
  const { surfaceDetail, renderStyle } = output;
  if (surfaceDetail !== 'TEXTURED') return SURFACE_DETAIL_TEXT[surfaceDetail];
  const base =
    RENDER_STYLE_TRAITS[renderStyle].contour === 'PIXEL' ? PIXEL_TEXTURED_TEXT : SURFACE_DETAIL_TEXT.TEXTURED;
  const limited = pinned || resolvePaletteLimit(renderStyle, output.paletteLimit) !== 'UNRESTRICTED';
  return limited ? `${base}${INSIDE_THE_LIMIT}` : base;
}
