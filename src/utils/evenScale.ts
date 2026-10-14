import type { SpriteBox } from '../types/quantiser.ts';
import type { SpriteCell } from '../types/spriteCell.ts';
import { gridStepFactor } from './gridStepFactor.ts';
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
 * fits every sprite.
 *
 * **An axis with no pitch to read takes the step the sheet states** (`SpriteCell.statedStep`), so a
 * sheet of one icon is resized as the same icon on a full sheet is. Where it states none either, the
 * largest factor that fits is the whole rule on that axis.
 *
 * Above 1 where the sheet was drawn smaller than the cell, which enlarges every sprite by the same
 * amount; see `resampleArea` for what enlarging by area does. `1` for a sheet with no sprites.
 *
 * Pure, as everything in this directory is.
 */
export function evenScale(boxes: readonly SpriteBox[], cell: SpriteCell): number {
  if (boxes.length === 0) return 1;
  const pitch = spritePitch(boxes);
  const across = pitch.x ?? cell.statedStep?.x ?? null;
  const down = pitch.y ?? cell.statedStep?.y ?? null;
  const fits = boxes.map((box) => Math.min(cell.width / box.width, cell.height / box.height));
  return Math.min(gridStepFactor(cell.width, across), gridStepFactor(cell.height, down), ...fits);
}
