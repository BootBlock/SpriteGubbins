import type { SpriteBox } from '../types/quantiser.ts';

/** Which way a sheet's sprites are gathered: into rows across it, or into columns down it. */
export type BandAxis = 'ROWS' | 'COLUMNS';

/**
 * The sheet's sprites gathered into the lines they share a band of the sheet on — rows, or columns.
 *
 * **A line is a band, not a coordinate.** Pieces belong together when their extents on the axis
 * across the line overlap by at least half the shorter of them, which is a rule about the artwork
 * rather than about the layout: a figure with a raised arm is taller than the one beside it and the
 * two still plainly sit on one row. Half is what separates that from a tall piece that merely clips
 * the row above.
 *
 * **The band narrows as the line grows, never widens.** Each accepted piece intersects the band
 * rather than extending it, so a line cannot walk across the sheet one piece at a time — which is
 * exactly what a widening band does on a sheet whose sprites are staggered, ending with every sprite
 * on the sheet in one line. What the band means is "the strip of the sheet every one of these pieces
 * passes through", and that is a property only intersection preserves. It is what keeps a pitch read
 * from these lines positive: two lines of a grid never merge through a tall piece reaching into the
 * next, the way `spriteRows`'s widening rows do.
 *
 * **The boxes are walked from the sheet's near edge, and this sorts them into that order rather than
 * trusting the caller to.** A greedy walk is only enough while a line's pieces arrive consecutively,
 * and depending on a caller's ordering is how the app came to hold two derivations of what a row is
 * (see `spriteRows`). A piece that does not share the current band opens a new line rather than being
 * offered to an earlier one — so a sheet interleaving two lines of very different sizes can split a
 * line in two. That is left as it is deliberately: the alternative is a clustering pass with a second
 * parameter nobody could tune.
 *
 * The lines come back in the order they were opened, each holding its boxes in the order they were
 * walked — by reference, which `spriteStrips` depends on. A caller that wants another order sorts.
 *
 * Pure, and dominated by the one sort of its input.
 */
export function spriteBands(boxes: readonly SpriteBox[], axis: BandAxis): readonly (readonly SpriteBox[])[] {
  const across = axis === 'ROWS' ? extentDown : extentAcross;
  const along = axis === 'ROWS' ? extentAcross : extentDown;
  const scanned = [...boxes].sort(
    (left, right) => across(left).start - across(right).start || along(left).start - along(right).start,
  );

  const lines: SpriteBox[][] = [];
  let line: SpriteBox[] = [];
  let band: Band | null = null;

  for (const box of scanned) {
    const extent = across(box);
    if (band !== null && shares(band, extent)) {
      line.push(box);
      band = { start: Math.max(band.start, extent.start), end: Math.min(band.end, extent.end) };
      continue;
    }
    if (line.length > 0) lines.push(line);
    line = [box];
    band = extent;
  }
  if (line.length > 0) lines.push(line);
  return lines;
}

/** A span of the sheet on one axis: its first pixel, and the first pixel past it. */
interface Band {
  readonly start: number;
  readonly end: number;
}

function extentDown(box: SpriteBox): Band {
  return { start: box.top, end: box.top + box.height };
}

function extentAcross(box: SpriteBox): Band {
  return { start: box.left, end: box.left + box.width };
}

/**
 * Whether two bands overlap by at least half the shorter of them.
 *
 * Half rather than any overlap at all, because any overlap is satisfied by a single pixel — so a tall
 * piece whose foot clips the row below would join it, and through it every piece that row holds.
 * Half of the *shorter* rather than of either one in particular, so the test says the same thing
 * whichever of the two is the larger: a raised arm makes one piece half again as tall as its
 * neighbour, and the two are still on one line.
 */
function shares(band: Band, extent: Band): boolean {
  const overlap = Math.min(band.end, extent.end) - Math.max(band.start, extent.start);
  return 2 * overlap >= Math.min(band.end - band.start, extent.end - extent.start);
}
