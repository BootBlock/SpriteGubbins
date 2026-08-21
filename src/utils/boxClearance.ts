import type { SpriteBox } from '../types/quantiser.ts';
import { boxSeparation } from './boxSeparation.ts';

/**
 * Whether a region a pass is about to write into sits against, or overlaps, anything else on the
 * sheet.
 *
 * The refusal both passes that *write artwork somewhere it was not* are built around — which is not
 * the same thing as the two of them doing the same kind of edit. `snapDuplicates` overwrites a
 * sprite with a different one, so it deletes what was there; `frameSnap` carries a sprite's own
 * pixels to a different place, so it deletes nothing. What they share is the write: each one's
 * region can be larger than the box it replaces, so each can cross into a neighbour, and
 * overwriting a sprite nobody asked about is the one outcome neither may produce.
 *
 * **"Against" and not merely "overlapping".** Two boxes a single pixel apart hold artwork that is
 * eight-connected, so a write landing that close would join two sprites into one region the next
 * segmentation reports as a single larger sprite — a pass quietly changing the sheet's sprite count
 * as a side effect of tidying it. {@link boxSeparation} is the labelling's own metric, which is what
 * keeps this asking the same question `spriteSegments` asks.
 *
 * `self` is the box the region is replacing, which is the one thing it is entitled to reach. Pass
 * `null` where every box in the list is somebody else's — the regions a pass has already accepted,
 * which is the second call each of them makes.
 *
 * Shared rather than written twice, because the two passes have to agree about what "next to"
 * means: one of them relaxing it would let that pass land a write the other's segmentation then
 * folds into its neighbour.
 */
export function reachesAny(region: SpriteBox, others: readonly SpriteBox[], self: SpriteBox | null): boolean {
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
      ) < 1,
  );
}
