import type { SpriteBox } from '../types/quantiser.ts';
import { boxSeparation } from './boxSeparation.ts';

/**
 * Whether a region a pass is about to write into sits close enough to anything else on the sheet
 * that the next segmentation would fold the two into one sprite.
 *
 * The refusal both passes that *write artwork somewhere it was not* are built around — which is not
 * the same thing as the two of them doing the same kind of edit. `snapDuplicates` overwrites a
 * sprite with a different one, so it deletes what was there; `frameSnap` carries a sprite's own
 * pixels to a different place, so it deletes nothing. What they share is the write: each one's
 * region can be larger than the box it replaces, so each can cross into a neighbour, and
 * overwriting a sprite nobody asked about is the one outcome neither may produce.
 *
 * **Within `gap`, and not merely touching.** Both passes are followed by a re-segmentation, and
 * `mergeNearby` folds any two boxes whose separation is at most `gap` into one. A write landing
 * that close to a neighbour that sat further off would have that neighbour absorbed into the edited
 * sprite — a pass quietly changing the sheet's sprite count, and with it every name, pack cell and
 * `.aseprite` frame after it, as a side effect of tidying the sheet. So the refusal is the merge's
 * own condition, measured with the merge's own metric, {@link boxSeparation}; at a gap of `0` it is
 * the labelling's eight-connectivity and nothing wider.
 *
 * The edited sprite's box after the write lies inside the region, so a region further than `gap`
 * from every other box leaves a box that is too. That holds only while nothing drawn sits against
 * the region, since a speck the write joins would carry the box past it — which is why both passes
 * ask `bordersArtwork` as well. The boxes it is checked against are the merge's
 * fixed point, already further than `gap` from one another, so no chain can form through them.
 *
 * `self` is the box the region is replacing, which is the one thing it is entitled to reach. Pass
 * `null` where every box in the list is somebody else's — the regions a pass has already accepted,
 * which is the second call each of them makes.
 *
 * Shared rather than written twice, because the two passes have to agree about what "next to"
 * means: one of them relaxing it would let that pass land a write the other's segmentation then
 * folds into its neighbour.
 */
export function reachesAny(
  region: SpriteBox,
  others: readonly SpriteBox[],
  self: SpriteBox | null,
  /** The sprite gap the next segmentation merges within — `QuantiseSettings.spriteGap`. */
  gap: number,
): boolean {
  return others.some(
    (other) =>
      other !== self &&
      boxSeparation(
        region.left,
        region.top,
        region.left + region.width,
        region.top + region.height,
        other.left,
        other.top,
        other.left + other.width,
        other.top + other.height,
      ) <= gap,
  );
}
