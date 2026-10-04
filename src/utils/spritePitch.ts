import type { SpriteBox } from '../types/quantiser.ts';
import { median } from './median.ts';
import { spriteBands } from './spriteBands.ts';
import type { BandAxis } from './spriteBands.ts';

/**
 * How far apart a sheet's sprites are laid, centre to centre, on each axis — `null` where unmeasured,
 * and otherwise always a positive, finite number of pixels.
 */
export interface SpritePitch {
  readonly x: number | null;
  readonly y: number | null;
}

/**
 * The step of the grid a sheet's sprites were laid out on, measured from the sprites themselves.
 *
 * **Line to line, and the median of every step.** Across, it is the distance from each column of the
 * sheet to the next; down, from each row to the next. A line stands where the median centre of its
 * sprites stands. Centres rather than edges, because a mark narrower than its neighbour starts later
 * and ends sooner, and its centre is the one point of it the layout placed. The median rather than
 * the mean, because one step is not like the others wherever a whole line is missing, and a mean
 * would drag the whole set's size towards that step.
 *
 * **The lines are `spriteBands`'s, not `spriteRows`'s.** `spriteRows` answers the reading order, so
 * its rows widen to take every sprite they touch — and a painted icon reaching below the top of the
 * row beneath chains two rows of the grid into one. Steps read within such a row run backwards
 * between its two halves, and the pitch came out negative: every sprite drawn at 1 × 1. The bands
 * here narrow instead, so two lines of a grid stay two lines, and the steps are taken between
 * line positions sorted along the axis, so none of them can be negative. A step of zero — two lines
 * standing at one place — says nothing about the grid and is left out.
 *
 * An axis is `null` where the sheet gives nothing to measure on it: one row has no step down, and one
 * column no step across.
 *
 * Pure, as everything in this directory is.
 */
export function spritePitch(boxes: readonly SpriteBox[]): SpritePitch {
  return { x: lineStep(boxes, 'COLUMNS'), y: lineStep(boxes, 'ROWS') };
}

/** The median step between consecutive lines on one axis, or `null` with fewer than two lines. */
function lineStep(boxes: readonly SpriteBox[], axis: BandAxis): number | null {
  const centre =
    axis === 'ROWS'
      ? (box: SpriteBox) => box.top + box.height / 2
      : (box: SpriteBox) => box.left + box.width / 2;
  const places = spriteBands(boxes, axis)
    .map((line) => median(line.map(centre)))
    .sort((before, after) => before - after);
  const steps = places.slice(1).flatMap((place, index) => {
    const step = place - (places[index] ?? place);
    return step > 0 ? [step] : [];
  });
  return steps.length === 0 ? null : median(steps);
}
