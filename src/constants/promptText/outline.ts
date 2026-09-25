import type { OutlineStyle } from '../../types/output.ts';
import type { Rgba } from '../../types/quantiser.ts';
import type { RenderStyle } from '../../types/rendering.ts';
import type { ContourKind } from '../../types/renderStyleTraits.ts';
import { FULLY_OPAQUE } from '../../utils/imageData.ts';
import { keyReaches } from '../../utils/keyReach.ts';
import { RENDER_STYLE_TRAITS } from './renderStyleTraits.ts';

/** The one outline that reads the same in every medium, because it draws nothing. */
const NO_OUTLINE = 'No outline — forms separate by value and hue contrast alone';

/**
 * The edge treatment as section 2 states it, in the words of the medium the style draws in.
 *
 * **"Single-pixel" belongs to the pixel styles alone.** Every entry once said it, so a painted, an
 * inked, a vector and a 3D sheet were each asked for a contour one pixel wide — a measurement their
 * own style line has no pixel to take — and an ink sheet was asked for it beside "visible drawn line
 * weight", which is a line whose width varies by definition (issue #406).
 *
 * **An `OWN_LINE` style has no entry for `OUTLINE_LESS_ALBEDO`, and that absence is the rule.** Its
 * own line names the contour, so "No outline" beside it is one prompt asking for a contour and
 * forbidding it; the setting chooses the colour of the line the style draws, and nothing else. The
 * keys of each entry are the outlines the studio offers for that kind — `outlinesFor` reads them
 * here, so the words and the choice cannot come apart.
 */
export const OUTLINE_TEXT: Readonly<Record<ContourKind, Readonly<Partial<Record<OutlineStyle, string>>>>> = {
  PIXEL: {
    DARK_LOCAL_CONTOUR: 'A single-pixel contour in a darker shade of each region’s own colour',
    PURE_BLACK_OUTLINE: 'A crisp single-pixel pure black outer contour',
    OUTLINE_LESS_ALBEDO: NO_OUTLINE,
  },
  LINE: {
    DARK_LOCAL_CONTOUR: 'A thin, even contour line in a darker shade of each region’s own colour',
    PURE_BLACK_OUTLINE: 'A crisp, thin pure black outer contour line',
    OUTLINE_LESS_ALBEDO: NO_OUTLINE,
  },
  OWN_LINE: {
    DARK_LOCAL_CONTOUR: 'The style’s own contour line, drawn in a darker shade of each region’s own colour',
    PURE_BLACK_OUTLINE: 'The style’s own contour line, drawn in pure black',
  },
};

/**
 * `PURE_BLACK_OUTLINE` on a sheet whose background key takes pure black, in each medium's words.
 *
 * Section 0 reserves the key colour for the background, so the plain wording asked every component
 * for a contour section 0 had just forbidden — one prompt disagreeing with itself, and on the sheet
 * that comes back a contour the Quantise tab keys out with the field, leaving every silhouette a
 * pixel thinner than it was drawn. The reader still asked for a hard, dark edge, so that is what this
 * keeps: the darkest line the key leaves drawable, rather than a different style.
 */
export const OUTLINE_BESIDE_BLACK_KEY_TEXT: Readonly<Record<ContourKind, string>> = {
  PIXEL:
    'A crisp single-pixel outer contour in a very dark grey, visibly lighter than the pure black the background is keyed on',
  LINE: 'A crisp, thin outer contour line in a very dark grey, visibly lighter than the pure black the background is keyed on',
  OWN_LINE:
    'The style’s own contour line, drawn in a very dark grey, visibly lighter than the pure black the background is keyed on',
};

/** The black a `PURE_BLACK_OUTLINE` contour names, as the colour `keyReaches` is asked about. */
const PURE_BLACK: Rgba = { r: 0, g: 0, b: 0, a: FULLY_OPAQUE };

/**
 * The edge treatment as section 2 states it, given the render style and the colour the background
 * is keyed on — or `''` where the style withdraws the line, which the template has dropped by then.
 *
 * Takes the outline the style has already been asked about — `styleSettingsFor` — so a stored
 * `OUTLINE_LESS_ALBEDO` under a cel style arrives here as the outline that style offers, never as a
 * lookup that finds nothing.
 *
 * Asked of the key's reach rather than of `backgroundKey === 'PURE_BLACK'`, so it is the same
 * question section 2's palette block asks about its entries and cannot come to a different answer.
 * Only `PURE_BLACK_OUTLINE` names a colour; the other two are relative to the component, and section
 * 0's reservation covers a local shade that happens to reach the key.
 */
export function outlineDescription(
  renderStyle: RenderStyle,
  outline: OutlineStyle | null,
  key: Rgba | null,
): string {
  const { contour } = RENDER_STYLE_TRAITS[renderStyle];
  if (contour === null || outline === null) return '';
  if (outline === 'PURE_BLACK_OUTLINE' && key !== null && keyReaches(key, PURE_BLACK)) {
    return OUTLINE_BESIDE_BLACK_KEY_TEXT[contour];
  }
  const text = OUTLINE_TEXT[contour][outline];
  if (text === undefined) throw new Error(`${renderStyle} offers no ${outline} outline.`);
  return text;
}
