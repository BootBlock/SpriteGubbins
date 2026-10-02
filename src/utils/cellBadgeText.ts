import type { SpriteBox } from '../types/quantiser.ts';
import type { SpriteCell } from '../types/spriteCell.ts';
import { evenScale } from './evenScale.ts';

/**
 * What the cell panel's chip says: how many pieces will not fit, or else the cell in force and, under
 * a fit that resizes, what it will do to the sprites — the panel's preview of the cut, since the
 * files themselves are written only at the press.
 *
 * The cell is named in every branch so the chip is worth reading in any — a reader who has just
 * typed a size wants to see the size they typed, whether or not it worked. `Scale evenly` states its
 * one factor as a percentage, which is the figure a reader checks against the sheet: a set drawn on a
 * 300-pixel step into a 128 px cell reads 43%, and a figure far from what they expected says the
 * sheet's pitch was measured from something other than the grid they drew.
 *
 * **Kept to the length of a chip rather than written as a sentence**, because `Badge` carries
 * `whitespace-nowrap` and is an inline-flex item that cannot shrink below its own text. Below
 * `--breakpoint-quantise` the panel is the page width, so a sentence here would spill past the
 * panel's border on a phone and give the body a horizontal scroll. The sentence a reader needs
 * exists twice already — the guidance behind the ⓘ, and the refusal the press itself reports, which
 * names the offending piece rather than only counting the pieces.
 *
 * Pure, as everything in this directory is.
 */
export function cellBadgeText(cell: SpriteCell, boxes: readonly SpriteBox[], over: number): string {
  const size = `${String(cell.width)} × ${String(cell.height)}`;
  if (over > 0) return `${over === 1 ? '1 sprite' : `${String(over)} sprites`} larger than ${size}`;
  if (cell.fit === 'SCALE_SET') return `${size} cell at ${String(Math.round(evenScale(boxes, cell) * 100))}%`;
  if (cell.fit === 'FILL_SQUARE') return `${size} cell, each square filled`;
  return `${size} cell`;
}
