import type { SpriteBox } from '../types/quantiser.ts';

/**
 * Whether two boxes from one segmentation name the same sprite: the same extent at the same place,
 * holding the same number of pixels.
 *
 * Compared by value rather than by object, because a duplicate group is a value: it carries boxes
 * so that it answers on its own, and a group built anywhere but `duplicateSprites`, as a test builds
 * one, can hold equal boxes as separate objects. Identity would then call a group's source and its
 * canonical two sprites when they are one. Two different sprites can share a bounding box only by
 * interleaving, and then the pixel count is what tells them apart.
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
