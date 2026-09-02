import { boxSeparation } from './boxSeparation.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import { disjointSet } from './unionFind.ts';

/**
 * Folding a sheet's connected regions into the sprites a reader would count.
 *
 * The second half of `spriteSegments`, and a separate question from the first: the labelling asks
 * which pixels touch, and this asks which of the regions that produced are parts of one drawing.
 * Nothing here reads a pixel — it works entirely in boxes, which is what makes it a merge rather
 * than a dilation, and what lets the duplicate snap measure against the same boxes with the same
 * metric.
 */

/** A box while it is still being grown, in the exclusive-edge form the merge below works in. */
export interface Bounds {
  left: number;
  top: number;
  /** Exclusive — the first column past the box. */
  right: number;
  /** Exclusive — the first row past the box. */
  bottom: number;
  pixels: number;
}

/**
 * Pieces close enough to be parts of one sprite, folded into one box.
 *
 * The failure this answers is a sprite that arrives in pieces: a sword held clear of the hand, a
 * shadow under the feet, a pauldron the keying cut away from the shoulder it sits on. Each is its
 * own connected region and none of them is a sprite. What they share is *proximity*, so two boxes
 * within `gap` drawn pixels of one another — measured the same eight-connected way the labelling
 * measures adjacency — become one.
 *
 * Distance is `boxSeparation` — the eight-connected metric the labelling itself uses, kept in one
 * place because the duplicate snap measures against these same boxes and the two must not disagree
 * about what "next to" means.
 *
 * **Boxes rather than pixels, which is what makes it a merge rather than a dilation.** Two regions
 * whose boxes overlap belong together however far apart their nearest pixels are: an outstretched
 * arm passes through the torso's box without touching a pixel of it. That is also why `gap` has no
 * off position — at zero this still folds boxes that overlap, which is the case a reader would
 * never want left apart.
 *
 * **Iterated to a fixed point**, because a merged box reaches further than either half did: fold a
 * sprite's top-left and bottom-right pieces together and the box that results covers the empty
 * bottom-left corner as well, where a third piece may be sitting. Each round is `O(n²)` in the boxes
 * still standing and every round but the last removes at least one of them, so
 * `SCATTERED_SPRITE_CEILING` is what makes the worst case affordable.
 *
 * Sorted top to bottom and left to right on the way out — reading order, so the sprite a reader
 * counts first in the preview is the first one anything downstream names.
 */
export function mergeNearby(pieces: readonly Bounds[], gap: number): SpriteBox[] {
  let boxes = pieces.map((piece) => ({ ...piece }));

  for (;;) {
    const folded = foldOnce(boxes, gap);
    if (folded.length === boxes.length) break;
    boxes = folded;
  }

  return boxes
    .sort((left, right) => left.top - right.top || left.left - right.left)
    .map((box) => ({
      left: box.left,
      top: box.top,
      width: box.right - box.left,
      height: box.bottom - box.top,
      pixels: box.pixels,
    }));
}

/**
 * One round of the merge: every pair within `gap` unioned, and one box per group.
 *
 * Union–find again, over the boxes this time, so a round folds a whole *chain* rather than a pair —
 * three pieces where the first is near the second and the second near the third come back as one box
 * even though the first and third are far apart. Without that, a limb attached through a joint would
 * take a round per joint.
 */
function foldOnce(boxes: readonly Bounds[], gap: number): Bounds[] {
  const { find, union } = disjointSet(boxes.length);

  for (const [left, first] of boxes.entries()) {
    for (let right = left + 1; right < boxes.length; right += 1) {
      const second = boxes[right];
      if (second === undefined) continue;
      const apart = boxSeparation(
        first.left,
        first.top,
        first.right,
        first.bottom,
        second.left,
        second.top,
        second.right,
        second.bottom,
      );
      if (apart > gap) continue;
      union(left, right);
    }
  }

  // Grouped by root, in the order the roots are first met, so the output keeps the scan order the
  // labelling produced and the fixed-point loop above cannot shuffle a settled answer.
  const groups = new Map<number, Bounds>();
  for (const [index, box] of boxes.entries()) {
    const root = find(index);
    const group = groups.get(root);
    if (group === undefined) {
      groups.set(root, { ...box });
      continue;
    }
    group.left = Math.min(group.left, box.left);
    group.top = Math.min(group.top, box.top);
    group.right = Math.max(group.right, box.right);
    group.bottom = Math.max(group.bottom, box.bottom);
    group.pixels += box.pixels;
  }

  return [...groups.values()];
}
