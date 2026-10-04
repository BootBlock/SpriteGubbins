import type { SpriteBox } from '../types/quantiser.ts';
import type { SpriteCell } from '../types/spriteCell.ts';
import { spritePitch } from './spritePitch.ts';

/**
 * The one factor every sprite of a sheet is resized by under `SCALE_SET`, so a set of isolated marks
 * keeps the sizes its icons have relative to one another.
 *
 * **The rule: one step of the sheet's grid becomes one cell.** The factor is the cell's side over the
 * sheet's measured pitch (`spritePitch`), per axis, and the smaller of the two where both are
 * measured, so a mark that filled seven tenths of its step of the grid fills seven tenths of its cell,
 * and the gutter the generator left between marks becomes the margin round each one. That is the
 * size a prompt asking for "N icons of 128 px on a grid" meant each step to stand for.
 *
 * **Then never larger than the largest sprite allows.** Boxes in one row are disjoint, but a sprite
 * may still be wider than the step where its neighbour is narrower, and a factor that took it past the
 * cell would need the refusal this fit exists to avoid. So the factor is also held to the largest that
 * fits every sprite — which is the whole rule on a sheet of one sprite, where there is no pitch to
 * read.
 *
 * Above 1 where the sheet was drawn smaller than the cell, which enlarges every sprite by the same
 * amount; see `resampleArea` for what enlarging by area does. `1` for a sheet with no sprites.
 *
 * Pure, as everything in this directory is.
 */
export function evenScale(boxes: readonly SpriteBox[], cell: SpriteCell): number {
  if (boxes.length === 0) return 1;
  const pitch = spritePitch(boxes);
  const fits = boxes.map((box) => Math.min(cell.width / box.width, cell.height / box.height));
  return Math.min(stepFactor(cell.width, pitch.x), stepFactor(cell.height, pitch.y), ...fits);
}

/**
 * The factor that makes one step of the grid one cell side, or no limit where there is no step.
 *
 * A step that is not a positive, finite length is no step: `spritePitch` promises never to return one,
 * and this refuses one all the same, because a negative factor draws every sprite at 1 × 1 and a zero
 * step makes an infinite one — the two ways a mismeasured grid used to reach the pack unnoticed.
 */
function stepFactor(side: number, pitch: number | null): number {
  return pitch !== null && pitch > 0 && Number.isFinite(pitch) ? side / pitch : Infinity;
}
