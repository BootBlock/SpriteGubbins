import type { SpriteBox } from '../types/quantiser.ts';
import type { SpritePin } from '../types/spriteAssignment.ts';

/**
 * Pinning a reader's decision to a place on the sheet, and finding it again after a re-segmentation.
 *
 * **The whole of how an assignment survives a dial.** Every control on the tab re-cuts the sheet:
 * the gap folds two boxes into one, the key's tolerance lets a fringe through that splits one in
 * two, a new grid re-measures all of them. So the boxes a decision was made against are gone by the
 * time it is read back, and the only thing that has not moved is the artwork itself.
 *
 * A centre point is what this file trades in, and `spritePin` says why the centre. Finding it again
 * is a containment test and nothing cleverer: no nearest-box search, no tolerance, no re-matching by
 * size. A decision whose point has stopped landing on a sprite is **lost**, and the panel says how
 * many were — because the alternative is to hand the decision to whichever sprite happens to be
 * closest, which is how a reader who fixed one wrong name ends up with a different wrong name and
 * nothing on screen saying so.
 *
 * Pure, as everything in this directory is.
 */

/**
 * The point a decision about this sprite is pinned to: the centre of its box, floored.
 *
 * Floored to a whole pixel so two runs of the same sheet produce the same pin to compare, and so the
 * value that ends up in a store is a coordinate on the result rather than a half-pixel a later
 * comparison has to round the same way.
 */
export function spritePin(box: SpriteBox): SpritePin {
  return {
    x: box.left + Math.floor(box.width / 2),
    y: box.top + Math.floor(box.height / 2),
  };
}

/** Whether two pins name the same point — the identity a decision is stored and matched under. */
export function samePin(left: SpritePin, right: SpritePin): boolean {
  return left.x === right.x && left.y === right.y;
}

/**
 * Which sprite this pin now falls inside, or `null` where none does.
 *
 * The **first** containing box, which matters because boxes can overlap: the gap merge produces
 * bounding boxes, and one sprite's box can reach across another's. First in reading order is the
 * same tie-break the rest of the app takes, so the answer is the one a reader meets first in the
 * preview rather than whichever the iteration happened to reach.
 */
export function pinnedSprite(boxes: readonly SpriteBox[], pin: SpritePin): number | null {
  const index = boxes.findIndex(
    (box) =>
      pin.x >= box.left && pin.x < box.left + box.width && pin.y >= box.top && pin.y < box.top + box.height,
  );
  return index === -1 ? null : index;
}
