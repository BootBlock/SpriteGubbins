import { renderingFieldFor } from '../constants/categories/index.ts';
import type { TargetSize } from '../types/output.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';
import { parseDisplaySize } from './displaySize.ts';

/**
 * How far a sheet's components are reduced between the size they are drawn at and the smallest size the
 * game shows them at (audit finding P6).
 *
 * ICON's *Smallest Display Size* reached the prompt as a bare line in section 1 and nothing else, so a
 * cyberpunk action bar drawn at `128 × 128 px per icon` for a 32 px display was never told it would be
 * shown at a quarter of its size, and a pixel-art set on a share profile was held to a 3 × 3 pixel floor
 * on cells two hundred pixels tall. Section 2 states the reduction from this record, and the sprite-scale
 * discipline fires on the display size where it is the smaller.
 *
 * **`drawn` is `null` where the prompt states no size in pixels**, which is every profile but `CUSTOM`
 * with a component size: a share profile states a share of a cell, and the canvas a generator delivers is
 * not a figure this app knows. Section 2 then states the floor as a fraction of the square each component
 * is drawn to, which is true whatever that square turns out to measure.
 */
export interface DisplayReduction {
  readonly display: TargetSize;
  readonly drawn: DrawnSize | null;
}

/** The size a component is drawn at, and the scale that size fits its display at. */
export interface DrawnSize {
  readonly size: TargetSize;
  readonly fit: FitScale;
}

/**
 * The scale a drawing fits its display at, `min(display.width / drawn.width, display.height /
 * drawn.height)`, kept as the two edges of the binding axis so the fraction stays exact: `shown /
 * drawn` is the scale, and every figure section 2 states is read off it.
 *
 * **One scale, not the smaller edge of each.** A drawing is reduced whole, so the axis that runs out
 * of display first sets the scale for both; comparing the smaller edges agrees with that only while
 * the two sizes share a shape. A `128 × 64` drawing shown at `24 × 48` is reduced to 3/16 by its
 * width, where the smaller edges, 24 and 64, would have stated 3/8 and a stroke floor half as wide.
 */
export interface FitScale {
  readonly shown: number;
  readonly drawn: number;
}

/**
 * The smallest display edge a floor can be stated against. Section 2 asks for strokes two displayed pixels
 * wide, so a display of two pixels or fewer is one stroke filling the whole icon, which is no floor at
 * all — and a typed `1 px` is a slip rather than a size.
 */
const SMALLEST_STATED_DISPLAY = 3;

/**
 * The reduction this subject's display size states against the component size the sheet states, or
 * `null` where there is none to state.
 *
 * `null` covers a category declaring no `DISPLAY_SIZE` field, a value with no size in it
 * (`parseDisplaySize`), a display too small to hold a two-pixel stroke with anything beside it
 * ({@link SMALLEST_STATED_DISPLAY}), and a component that fits its display at a scale of one or more
 * ({@link FitScale}) — which is no reduction, and leaves section 2's own pixel floor to govern.
 *
 * The display's smaller edge is what {@link SMALLEST_STATED_DISPLAY} is held against, and what the
 * floors are stated against where no drawn size is stated: a square drawn to an unknown size fits its
 * display at the display's smaller edge, whichever edge that is.
 */
export function displayReduction(
  category: SubjectCategory,
  subject: SubjectDefinition,
  drawn: TargetSize | null,
): DisplayReduction | null {
  const field = renderingFieldFor(category, 'DISPLAY_SIZE');
  if (field === null) return null;
  const display = parseDisplaySize(subject[field.key]);
  if (display === null || smallerEdge(display) < SMALLEST_STATED_DISPLAY) return null;
  if (drawn === null) return { display, drawn: null };
  const fit = fitScale(display, drawn);
  return fit.shown < fit.drawn ? { display, drawn: { size: drawn, fit } } : null;
}

/** The edges of the axis whose display-over-drawn ratio is the smaller, compared without dividing. */
function fitScale(display: TargetSize, drawn: TargetSize): FitScale {
  return display.width * drawn.height <= display.height * drawn.width
    ? { shown: display.width, drawn: drawn.width }
    : { shown: display.height, drawn: drawn.height };
}

/** The smaller of a size's two edges. */
function smallerEdge(size: TargetSize): number {
  return Math.min(size.width, size.height);
}
