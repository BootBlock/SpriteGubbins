import type { SpriteBox } from '../types/quantiser.ts';

/**
 * Whether two boxes from one segmentation name the same sprite: the same extent at the same place,
 * holding the same number of pixels.
 *
 * Compared field by field rather than by object, because a duplicate group crosses the worker
 * boundary as a structured clone, where its `source` and its `canonical` arrive as two objects even
 * when they were one. Two different sprites can share a bounding box only by interleaving, and then
 * the pixel count is what tells them apart.
 */
export function sameBox(left: SpriteBox, right: SpriteBox): boolean {
  return (
    left.left === right.left &&
    left.top === right.top &&
    left.width === right.width &&
    left.height === right.height &&
    left.pixels === right.pixels
  );
}
