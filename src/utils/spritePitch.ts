import type { SpriteBox } from '../types/quantiser.ts';
import { median } from './median.ts';
import { spriteRows } from './spriteRows.ts';

/** How far apart a sheet's sprites are laid, centre to centre, on each axis — `null` where unmeasured. */
export interface SpritePitch {
  readonly x: number | null;
  readonly y: number | null;
}

/**
 * The step of the grid a sheet's sprites were laid out on, measured from the sprites themselves.
 *
 * **Centre to centre, and the median of every step.** Across, it is each sprite's distance from the
 * one before it in its row; down, each row's distance from the row above, from the middle of one
 * band to the middle of the next. Centres rather than edges, because a mark narrower than its
 * neighbour starts later and ends sooner, and its centre is the one point of it the layout placed. The
 * median rather than the mean, because one step is not like the others wherever a row is short or a
 * sprite is missing from it, and a mean would drag the whole set's size towards that step.
 *
 * **The rows are `spriteRows`'s**, the one derivation of a row the app has, so this reads the sheet in
 * the order every file of the pack is named in.
 *
 * An axis is `null` where the sheet gives nothing to measure on it: one row has no step down, and a
 * sheet whose every row holds one sprite has no step across.
 *
 * Pure, as everything in this directory is.
 */
export function spritePitch(boxes: readonly SpriteBox[]): SpritePitch {
  const rows = spriteRows(boxes);
  const across = rows.flatMap((row) =>
    row.boxes.slice(1).map((box, index) => {
      const before = row.boxes[index] ?? box;
      return box.left + box.width / 2 - (before.left + before.width / 2);
    }),
  );
  const down = rows.slice(1).map((row, index) => {
    const above = rows[index] ?? row;
    return (row.top + row.bottom) / 2 - (above.top + above.bottom) / 2;
  });
  return { x: across.length === 0 ? null : median(across), y: down.length === 0 ? null : median(down) };
}
