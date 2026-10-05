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
  readonly drawn: TargetSize | null;
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
 * ({@link SMALLEST_STATED_DISPLAY}), and a component drawn no larger than it is shown — which is no
 * reduction, and leaves section 2's own pixel floor to govern.
 *
 * **Keyed on the smaller edge of each**, for the reason `minFeatureSize` keys on it: that is the edge
 * detail runs out on.
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
  if (drawn !== null && smallerEdge(drawn) <= smallerEdge(display)) return null;
  return { display, drawn };
}

/** The smaller of a size's two edges. */
function smallerEdge(size: TargetSize): number {
  return Math.min(size.width, size.height);
}
