import { ATLAS_CANVAS_SIZES } from '../types/atlas.ts';
import type { AtlasCanvasSize, AtlasConfig, SpriteFit } from '../types/atlas.ts';
import type { TargetSize } from '../types/output.ts';
import { calculateAtlasMetrics } from './atlasCalculator.ts';

/**
 * Checking the component size the prompt asks for against the cell the atlas affords.
 *
 * This is the comparison that turns the calculator from a display into a decision. On its own,
 * "usable bounds: 219 px" answers nothing — 219 px of what, and is it enough? The studio already
 * states the size the generator is being asked to draw each component at, so the calculator has
 * both halves and only ever showed one.
 */

/**
 * The largest whole-number scale at which `target` fits a square cell of `usableBounds`.
 *
 * Whole numbers, and both axes. A fractional scale resamples the artwork, which is the one thing a
 * sprite atlas must not do to pixel art, so 1.6× is reported as 1× with the remainder left as
 * headroom. Taking the smaller of the two axes' scales is what stops a tall component being called
 * a fit because its *width* had room.
 */
export function spriteFitFor(usableBounds: number, target: TargetSize): SpriteFit {
  const scale = Math.min(Math.floor(usableBounds / target.width), Math.floor(usableBounds / target.height));
  if (scale < 1) return { target, scale: 0, placedWidth: 0, placedHeight: 0 };

  return {
    target,
    scale,
    placedWidth: target.width * scale,
    placedHeight: target.height * scale,
  };
}

/**
 * The smallest texture offered that still seats every component at 1:1 or better, or `null` where
 * none of them does.
 *
 * Both answers are actionable and neither was available before: the first says the chosen texture
 * can be cut down — halving the edge quarters the memory — and `null` says no texture in the list
 * will do, so the component count or the target size has to give. Searching rather than solving,
 * because the grid maths floors twice and there are five candidates.
 */
export function smallestCanvasFor(
  config: Omit<AtlasConfig, 'canvasSize'>,
  target: TargetSize,
): AtlasCanvasSize | null {
  return (
    ATLAS_CANVAS_SIZES.find(
      (canvasSize) =>
        spriteFitFor(calculateAtlasMetrics({ ...config, canvasSize }).usableBounds, target).scale >= 1,
    ) ?? null
  );
}
