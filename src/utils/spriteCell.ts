import { SPRITE_CELL_SIDE_RANGE } from '../constants/spriteCell.ts';
import type { TargetSize } from '../types/output.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import type { CellAnchorX, CellAnchorY, SpriteCell, SpriteCellChoice } from '../types/spriteCell.ts';

/**
 * Cutting each sprite into a fixed cell instead of into its own bounding box.
 *
 * The arithmetic behind {@link SpriteCell}, kept apart from every consumer because four of them
 * read it: the cell panel warns on a sprite that will not fit, the download button resolves the cell
 * it sends, `writeSheet` refuses to write one, and `buildManifest` states what it cut. Two readings
 * of "does this sprite fit" would be two answers to one question on one screen, and the one the
 * reader acts on would be the panel's.
 *
 * **Everything here works in the sheet's own drawn pixels.** The download's magnification is applied
 * once, beside `scaleBoxes`, to the offsets this produces — so the offset a sprite sits at inside
 * its cell is one placement magnified rather than a rounding that moves with the factor.
 *
 * **A cell is a canvas, never a window onto the sheet.** Nothing here widens a rect: a sprite's own
 * bounding box is what gets cut, and `placeInCell` lays it on the cell. Widening the rect instead
 * reaches into whatever the sheet holds a gutter away, which is measured there.
 *
 * Pure, as everything in this directory is.
 */

/**
 * How far along a span an alignment lands, from its near end.
 *
 * One function for the two questions that turn out to be the same one: where the artwork's own box
 * starts inside the cell — the span there is the slack, cell less box — and where the pivot lands
 * inside the cell, where the span is the cell itself.
 */
function offsetFor(span: number, anchor: CellAnchorX | CellAnchorY): number {
  if (anchor === 'LEFT' || anchor === 'TOP') return 0;
  if (anchor === 'RIGHT' || anchor === 'BOTTOM') return span;
  // Floored rather than rounded, so an odd span puts the extra pixel on the side the reader can
  // predict — the same choice `buildManifest` makes for a pivot between two pixels, and for the same
  // reason: a half-pixel is resolved differently by every consumer.
  return Math.floor(span / 2);
}

/**
 * The cell in force, or `null` where each sprite keeps its bounding box.
 *
 * **`TARGET` degrades to `null` where the studio states no size**, in the way `resolveMode` and its
 * neighbours degrade a stored value the configuration cannot honour: the control does not offer that
 * position while there is no target, and this is what makes the absence safe wherever the two are
 * out of step — a size guessed here would be a cut nobody asked for.
 */
export function resolveSpriteCell(choice: SpriteCellChoice, target: TargetSize | null): SpriteCell | null {
  if (choice.source === 'BOX') return null;
  if (choice.source === 'FIXED') {
    return { width: choice.fixed.width, height: choice.fixed.height, anchor: choice.anchor };
  }
  if (target === null || !targetFitsCell(target)) return null;
  return { width: target.width, height: target.height, anchor: choice.anchor };
}

/**
 * Whether the studio's stated component size is a size this tab will cut a cell at.
 *
 * **The studio's field is free prose**, so its size is whatever a reader typed — `parseTargetSize`
 * accepts five digits a side — while the two boxes beside the pills are held to
 * `SPRITE_CELL_SIDE_RANGE`. Without this the ceiling applied to one of the two sources and not the
 * other, and a target of `2048 × 2048` on a fifteen-sprite sheet asked the writer for fifteen cells
 * of sixteen megabytes apiece before any of them was encoded. The control asks this before offering
 * the position, so a size out of range shows as an absent pill rather than as a download that dies.
 */
export function targetFitsCell(target: TargetSize): boolean {
  const { min, max } = SPRITE_CELL_SIDE_RANGE;
  return target.width >= min && target.width <= max && target.height >= min && target.height <= max;
}

/**
 * Which sprites are too big for the cell, by their reading-order position counting from zero.
 *
 * **A refusal rather than a resample**, and this is the reading both halves of that refusal are
 * taken from. A sprite wider or taller than the cell is not a cut that needs squeezing — it is a
 * sheet that came back at a coarser scale than the prompt asked for, or a cell smaller than the
 * artwork it was meant to hold, and squeezing it would hand a rig a piece whose pixels no longer
 * line up with any of its neighbours.
 *
 * Empty where every sprite fits, which is the case the whole feature exists to produce.
 */
export function oversizedSprites(boxes: readonly SpriteBox[], cell: SpriteCell): readonly number[] {
  const over: number[] = [];
  for (const [index, box] of boxes.entries()) {
    if (box.width > cell.width || box.height > cell.height) over.push(index);
  }
  return over;
}

/**
 * Where each sprite's own bounding box sits inside its cell, so the artwork lands on the anchor.
 *
 * A displacement rather than a rect, because that is what the cut actually needs: the pack crops the
 * bounding box out of the sheet and `placeInCell` lays it down here, which is what keeps a
 * neighbouring sprite's pixels out of this sprite's file. It is also what a consumer compositing
 * from the sheet itself has to know, and the manifest states it per sprite for that reason.
 *
 * **Every sprite must fit**, which is {@link oversizedSprites}'s question and the caller's job to
 * have asked: `writeSheet` refuses before reaching here. Handed a sprite that does not, this returns
 * a negative displacement, and `placeInCell` clips the overhang away.
 */
export function cellOffsets(
  boxes: readonly SpriteBox[],
  cell: SpriteCell,
): readonly { readonly x: number; readonly y: number }[] {
  return boxes.map((box) => ({
    x: offsetFor(cell.width - box.width, cell.anchor.x),
    y: offsetFor(cell.height - box.height, cell.anchor.y),
  }));
}

/**
 * The point on a sprite's own box that the artwork was registered against, in the box's own pixels.
 *
 * This is what a cell's pivot is: the reader named an anchor because that is where the piece joins
 * whatever carries it, so the pivot is that same point rather than a second convention beside it.
 * A point on the *box* rather than in the cell, because that is what a manifest states about a
 * sprite on a sheet — `ManifestSprite.cellOffset` is what moves it into a cell.
 *
 * At the default anchor — bottom-centre — it produces exactly the foot-of-the-box figure
 * `buildManifest` stated before a cell could be asked for, which is what keeps the two cuts
 * describing one quantity.
 */
export function cellPivot(box: SpriteBox, anchor: SpriteCell['anchor']): { x: number; y: number } {
  return {
    x: box.left + offsetFor(box.width, anchor.x),
    y: box.top + offsetFor(box.height, anchor.y),
  };
}

/**
 * Why a pack could not be cut into this cell, as the sentence the refusal is reported with.
 *
 * Names the first offender and counts the rest, because a sheet drawn one step too coarse puts every
 * sprite over at once and a list of fifteen would say no more than the first does. The ordinal is
 * the manifest's own numbering, counting from one, so a reader can find the piece in the preview's
 * Sprites mode.
 */
export function oversizeReason(
  boxes: readonly SpriteBox[],
  cell: SpriteCell,
  over: readonly number[],
): string {
  const first = over[0];
  const box = first === undefined ? undefined : boxes[first];
  if (first === undefined || box === undefined) return '';
  const rest = over.length - 1;
  const others = rest === 0 ? '' : ` and ${String(rest)} more ${rest === 1 ? 'does' : 'do'} not fit either`;
  return `Sprite ${String(first + 1)} is ${String(box.width)} × ${String(box.height)} drawn pixels, larger than the ${String(cell.width)} × ${String(cell.height)} cell${others} — raise the cell, or re-generate the sheet at the scale the prompt asked for`;
}
