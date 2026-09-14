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
 * Which sprite this pin names now: the one whose own pin it *is*, or failing that the one it falls
 * inside. `null` where neither finds anything.
 *
 * **The exact match comes first, and that ordering is the whole correctness of this file.** A pin is
 * written down as a sprite's own centre and read back by containment, and the two answers diverge —
 * one sprite's bounding box can contain another's centre, which any ring, frame or hoop with
 * something loose inside it produces, and the gap merge produces it too. Resolving by containment
 * alone then handed every decision made on the inner sprite to the outer one: the reader left the
 * dot out and the ring disappeared from the download instead. Trying the exact match first means
 * that while nothing has moved — which is every sheet nobody has re-cut — each decision finds the
 * sprite it was made on and no other.
 *
 * Containment is the fallback, and it is what carries a decision across a dial that re-cut the
 * sheet. A box that grew by a row of fringe has a new centre, so no exact match exists, and the old
 * centre is still inside it.
 *
 * **`taken` is how one sprite ends up with one decision.** Resolution walks the reader's decisions in
 * the order they were made and claims a sprite for each; a later decision may not take a sprite an
 * earlier one holds. Without it, a merge that folds two sprites into one would silently give the
 * survivor two decisions and quietly apply whichever the code reached last.
 */
export function locateSprite(
  boxes: readonly SpriteBox[],
  pin: SpritePin,
  taken: ReadonlySet<number> = EMPTY,
): number | null {
  const exact = boxes.findIndex((box, index) => !taken.has(index) && samePin(spritePin(box), pin));
  if (exact !== -1) return exact;

  const inside = boxes.findIndex(
    (box, index) =>
      !taken.has(index) &&
      pin.x >= box.left &&
      pin.x < box.left + box.width &&
      pin.y >= box.top &&
      pin.y < box.top + box.height,
  );
  return inside === -1 ? null : inside;
}

/** One empty set rather than a fresh one per call, for the callers that claim nothing. */
const EMPTY: ReadonlySet<number> = new Set();
