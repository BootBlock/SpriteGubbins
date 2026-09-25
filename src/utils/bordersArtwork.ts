import type { SpriteBox } from '../types/quantiser.ts';
import { FULLY_TRANSPARENT, alphaAt, pixelOffset } from './imageData.ts';

/**
 * Whether any drawn pixel sits directly against a region a pass is about to write into.
 *
 * The half of the write refusal that {@link reachesAny} cannot see. That rule measures the region
 * against the sprites' boxes, and a box is all the segmentation keeps of a sprite — a **speck**, a
 * region smaller than `SMALLEST_SPRITE_PIXELS`, is counted and then dropped without a position. So
 * a write can land against a speck the box rule never heard of, and the next labelling joins the two:
 * the edited sprite's box grows past the region by the speck's extent, which is far enough to come
 * within the sprite gap of a neighbour the region itself cleared — and the gap merge then folds that
 * neighbour in, changing the sprite count this refusal exists to hold.
 *
 * **The one-pixel ring around the region is the whole question.** Anything the write can join to lies
 * outside the region, and an eight-connected path from inside the region to outside it has to cross
 * that ring. A ring with nothing drawn in it therefore leaves the edited sprite inside the region,
 * which is the premise `reachesAny`'s gap rule is built on. The test is on the region's box rather
 * than on the pixels the write draws, so a speck that touches the region but not the artwork is
 * refused as well — conservative, and on a real sheet a speck sits in a gutter rather than against
 * a sprite's box.
 *
 * Nothing that belongs to the edited sprite can be in the ring, because both passes build the region
 * to cover the box they replace. A sprite whose artwork reaches the ring is caught here as well as by
 * `reachesAny`, since its box is within any gap; the speck is the case only this check can see.
 *
 * Pure. A walk of the ring's perimeter, clipped to the sheet, so linear in the region's outline.
 */
export function bordersArtwork(image: ImageData, region: SpriteBox): boolean {
  const left = region.left - 1;
  const top = region.top - 1;
  const right = region.left + region.width;
  const bottom = region.top + region.height;

  const drawn = (x: number, y: number): boolean =>
    x >= 0 &&
    y >= 0 &&
    x < image.width &&
    y < image.height &&
    alphaAt(image.data, pixelOffset(image.width, x, y)) !== FULLY_TRANSPARENT;

  for (let x = left; x <= right; x += 1) {
    if (drawn(x, top) || drawn(x, bottom)) return true;
  }
  for (let y = top + 1; y < bottom; y += 1) {
    if (drawn(left, y) || drawn(right, y)) return true;
  }
  return false;
}
