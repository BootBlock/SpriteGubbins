import { SMALLEST_STRIP_FRAMES } from '../constants/quantiser.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import { spriteBands } from './spriteBands.ts';

/**
 * The sheet's sprites gathered into the rows they were laid out in — the strips a run of frames
 * lives on.
 *
 * The question the segmentation leaves open. `spriteSegments` says *how many* separate pieces the
 * sheet holds and where each of them is, and every reading built on it so far has treated those
 * pieces as an unordered set: the symmetry pass scores each on its own, and the duplicate pass
 * compares every pair. A sprite sheet is not an unordered set. It is rows, and a row is a run — a
 * walk cycle, a turntable, eight facings — which is the only structure in which "this frame has
 * drifted" means anything at all.
 *
 * **A row is a band, not a coordinate**, and the band narrows as the row grows: the rows are
 * `spriteBands`'s, which is where that rule and its reasons live. A piece that does not share the
 * current band opens a new row, so a sheet interleaving two rows of very different heights can split
 * a row in two — and each half of a split row is still fitted and read honestly, or dropped, where
 * the split leaves it under the floor below, which is the same rule every short row falls to.
 *
 * Rows shorter than {@link SMALLEST_STRIP_FRAMES} are dropped rather than returned as short strips —
 * see `SpriteStrip`, which is where the reason lives: a pitch fitted to two frames is the distance
 * between them, so a pair reports no drift on any sheet ever handed to it.
 *
 * Sorted left to right on the way out, which is the order a run plays in and the order the panel and
 * the onion skin both count frames in.
 *
 * **The boxes come back by reference, and one caller depends on that.** `frameAlignment`'s room
 * check excludes a frame's own box from the sheet's boxes by object identity, so a `.map()` here
 * that cloned a box — rather than the array holding it — would silently make every frame refuse its
 * own move. The rows are new arrays; the boxes in them are the ones this was handed.
 *
 * Pure, and dominated by the one sort of its input.
 */
export function spriteStrips(boxes: readonly SpriteBox[]): readonly (readonly SpriteBox[])[] {
  return spriteBands(boxes, 'ROWS')
    .filter((members) => members.length >= SMALLEST_STRIP_FRAMES)
    .map((members) => [...members].sort((left, right) => left.left - right.left));
}
