import { SMALLEST_STRIP_FRAMES } from '../constants/quantiser.ts';
import type { SpriteBox } from '../types/quantiser.ts';

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
 * **A row is a band, not a coordinate.** Pieces belong together when their vertical extents overlap
 * by at least half the shorter of them, which is a rule about the artwork rather than about the
 * layout: a figure with a raised arm is taller than the one beside it and the two still plainly sit
 * on one line. Half is what separates that from a tall piece that merely clips the row above.
 *
 * **The band narrows as the row grows, never widens.** Each accepted piece intersects the band
 * rather than extending it, so a row cannot walk down the sheet one piece at a time — which is
 * exactly what a widening band does on a sheet whose sprites are staggered, ending with every
 * sprite on the sheet in one row. What the band means is "the strip of the sheet every one of these
 * pieces passes through", and that is a property only intersection preserves.
 *
 * **The boxes are walked in the order they arrive, and that order is reading order.**
 * `spriteSegments` returns them topmost-first, so a row's pieces are consecutive on every ordinary
 * sheet and a greedy walk is enough. A piece that does not share the current band opens a new row
 * rather than being offered to an earlier one — so a sheet interleaving two rows of very different
 * heights can split a row in two. That is left as it is deliberately: the alternative is a
 * clustering pass with a second parameter nobody could tune, and each half of a split row is still
 * fitted and read honestly — or dropped, where the split leaves it under the floor below, which is
 * the same rule every short row falls to.
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
 * Pure, and linear in the boxes.
 */
export function spriteStrips(boxes: readonly SpriteBox[]): readonly (readonly SpriteBox[])[] {
  const rows: SpriteBox[][] = [];
  let row: SpriteBox[] = [];
  let band: Band | null = null;

  for (const box of boxes) {
    const extent: Band = { top: box.top, bottom: box.top + box.height };
    if (band !== null && shares(band, extent)) {
      row.push(box);
      band = { top: Math.max(band.top, extent.top), bottom: Math.min(band.bottom, extent.bottom) };
      continue;
    }
    if (row.length > 0) rows.push(row);
    row = [box];
    band = extent;
  }
  if (row.length > 0) rows.push(row);

  return rows
    .filter((members) => members.length >= SMALLEST_STRIP_FRAMES)
    .map((members) => [...members].sort((left, right) => left.left - right.left));
}

/** A span of rows of the sheet: the first row it covers, and the first row past it. */
interface Band {
  readonly top: number;
  /** Exclusive — the first row past the band. */
  readonly bottom: number;
}

/**
 * Whether two bands overlap by at least half the shorter of them.
 *
 * Half rather than any overlap at all, because any overlap is satisfied by a single row — so a tall
 * piece whose foot clips the row below would join it, and through it every piece that row holds.
 * Half of the *shorter* rather than of either one in particular, so the test says the same thing
 * whichever of the two is the taller: a raised arm makes one piece half again as tall as its
 * neighbour, and the two are still on one line.
 */
function shares(band: Band, extent: Band): boolean {
  const overlap = Math.min(band.bottom, extent.bottom) - Math.max(band.top, extent.top);
  return 2 * overlap >= Math.min(band.bottom - band.top, extent.bottom - extent.top);
}
