import { MANUAL_GRID_RANGE } from '../constants/quantiser.ts';
import type { TargetSize } from '../types/output.ts';
import type { PixelGrid } from '../types/quantiser.ts';
import { componentGridScale } from './componentGridScale.ts';

/**
 * Turning the studio's stated component size into a pixel scale the returned sheet might have been
 * drawn at.
 *
 * The size and the sheet's scale are related only through how many components the sheet carries,
 * which is the relation {@link componentGridScale} performs. Its answer is therefore a *candidate*,
 * offered beside what detection found and never silently preferred: a generator that left half the
 * canvas empty was drawn at a smaller scale than this suggests.
 *
 * **The prompt now asks for the arrangement this reads back.** Section 2 states the target component
 * size as a native pixel grid and the whole-number enlargement the sheet presents it at, derived by
 * `nativeGridScale` from the same arithmetic — so a sheet returned against a current prompt is one
 * this reading was written for, rather than one it merely hoped for.
 *
 * Split from `parseTargetSize` rather than filed with it because this half takes an `ImageData` —
 * see the note there, which records what putting the two together costs.
 */

/**
 * The largest pixel scale at which this sheet could still hold every component at the target size,
 * or `null` when even 1:1 cannot fit them.
 *
 * An **upper bound**, then, rather than a measurement, which is exactly why the tab offers it as a
 * candidate to click rather than adopting it. Measuring the drawn scale properly means finding where
 * one component actually sits, and cutting the sheet into components is a separate tool.
 *
 * Clamped to the ceiling of what the manual control accepts, so an offered scale is always one the
 * reader could have typed and can correct in place. Clamping *down* keeps the answer true: every
 * scale below one that fits also fits. The range's floor needs no clamp and may not have one —
 * `componentGridScale` bottoms out at 1, which is the smallest scale the control accepts, and
 * clamping *up* to a higher floor would offer a scale that does not fit at all.
 */
export function targetSizeGrid(image: ImageData, target: TargetSize, components: number): PixelGrid | null {
  const scale = componentGridScale({ width: image.width, height: image.height }, target, components);
  return scale === null ? null : Math.min(scale, MANUAL_GRID_RANGE.max);
}
