import { SPRITE_CELL_SIDE_RANGE } from '../constants/spriteCell.ts';
import type { CellLattice } from '../types/cellLattice.ts';
import type { TargetSize } from '../types/output.ts';
import type { PixelGrid, SpriteBox } from '../types/quantiser.ts';
import type {
  CellAnchorX,
  CellAnchorY,
  SheetRegion,
  SheetStep,
  SpriteCell,
  SpriteCellChoice,
  SpriteFit,
  SpritePlacement,
} from '../types/spriteCell.ts';
import { evenScale } from './evenScale.ts';
import { inPlacePlacement } from './inPlacePlacement.ts';

/**
 * Cutting each sprite into a fixed cell instead of into its own bounding box.
 *
 * The arithmetic behind {@link SpriteCell}, kept apart from every consumer because four of them
 * read it: the cell panel warns on a sprite that will not fit, the download button resolves the cell
 * it sends, `writeSheet` refuses to write one, and `buildManifest` states what it cut. Two readings
 * of "does this sprite fit" would be two answers to one question on one screen, and the one the
 * reader acts on would be the panel's. The same holds for how big each sprite is drawn in its cell
 * under a fit that resizes, which `cellPlacements` answers once for the manifest and the pack.
 *
 * **Everything here works in the sheet's own drawn pixels.** The download's magnification is applied
 * once, beside `scaleBoxes`, to the placements this produces — so where a sprite sits inside
 * its cell, and at what size, is one placement magnified rather than a rounding that moves with the
 * factor.
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
export function resolveSpriteCell(
  choice: SpriteCellChoice,
  target: TargetSize | null,
  grid: PixelGrid | null,
  statedStep: SheetStep | null,
  lattice: CellLattice | null,
): SpriteCell | null {
  if (choice.source === 'BOX') return null;
  const size =
    choice.source === 'FIXED' ? choice.fixed : target !== null && targetFitsCell(target) ? target : null;
  if (size === null) return null;
  const resamples = resizingFitAllowed(grid);
  return {
    width: size.width,
    height: size.height,
    anchor: choice.anchor,
    fit: resolvedFit(choice.fit, resamples, lattice),
    statedStep,
    lattice,
    resamples,
  };
}

/**
 * The fit a cut takes, for the one the reader stored.
 *
 * **A placement sheet takes `IN_PLACE` whatever is stored**, as a pixel-art sheet takes `REFUSE`: its
 * pieces are drawn at their place on the icon, and any other fit would cut each to its own box and move
 * it. **Off a placement sheet a stored `IN_PLACE` is `REFUSE`**, the fit with no cells to read. The
 * second degradation is the pixel scale's: a resizing fit on a sheet with a pixel scale is a stored
 * choice the sheet cannot honour, and the control withholds it there for that reason.
 */
function resolvedFit(stored: SpriteFit, resamples: boolean, lattice: CellLattice | null): SpriteFit {
  if (lattice !== null) return 'IN_PLACE';
  if (stored === 'IN_PLACE') return 'REFUSE';
  return resamples ? stored : 'REFUSE';
}

/**
 * Whether a sheet read at this pixel scale may have its sprites resized into their cells.
 *
 * **Only at a grid of 1, or before any grid is settled.** A grid above 1 says the sheet is pixel art
 * drawn at a scale, which the lattice reading has already brought down to one file pixel per drawn
 * pixel; resizing that by area would blend the pixels the reading exists to keep apart, so such a
 * sheet keeps `REFUSE` whatever is stored. With no result yet there is nothing to write, and the
 * stored choice stands for the result to come.
 */
export function resizingFitAllowed(grid: PixelGrid | null): boolean {
  return grid === null || grid === 1;
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
 * **Under `REFUSE`, a refusal rather than a resample**, and this is the reading both halves of that
 * refusal are taken from. A sprite wider or taller than the cell is not a cut that needs squeezing —
 * it is a sheet that came back at a coarser scale than the prompt asked for, or a cell smaller than
 * the artwork it was meant to hold, and squeezing it would hand a rig a piece whose pixels no longer
 * line up with any of its neighbours. The two resizing fits refuse nothing: they are the reader
 * saying the sheet is painted and its sprites are to be resized, the one case where that is the
 * request.
 *
 * Empty where every sprite fits, which is the case the whole feature exists to produce.
 */
export function oversizedSprites(boxes: readonly SpriteBox[], cell: SpriteCell): readonly number[] {
  if (cell.fit === 'IN_PLACE') return outOfPlace(boxes, cell);
  // A resizing fit brings every sprite inside the cell by construction — see `cellPlacements`.
  if (cell.fit !== 'REFUSE') return [];
  const over: number[] = [];
  for (const [index, box] of boxes.entries()) {
    if (box.width > cell.width || box.height > cell.height) over.push(index);
  }
  return over;
}

/**
 * How each sprite becomes its cell: the region of the sheet cut for it, and where that region lands
 * in the cell and at what size — see {@link SpritePlacement}.
 *
 * **Under `REFUSE` a displacement and nothing more.** The region is the sprite's own bounding box at
 * its own size, which is what keeps a neighbouring sprite's pixels out of this sprite's file, and the
 * offset is what a consumer compositing from the sheet has to know, so the manifest states it per
 * sprite. Every sprite must fit, which is {@link oversizedSprites}'s question and the caller's job to
 * have asked: `writeSheet` refuses before reaching here. Handed a sprite that does not, this returns
 * a negative displacement, and `placeInCell` clips the overhang away.
 *
 * **Under `SCALE_SET` the region is still the box**, drawn at the sheet's one factor (`evenScale`),
 * each side rounded to a whole pixel and never past the cell.
 *
 * **Under `FILL_SQUARE` the region is the square at the centre of the box**, its side the box's
 * shorter one, drawn at the cell's shorter side. A full-bleed tile is meant to be square, so what this
 * trims is the strip or two of pixels a generator's tile ran over on one axis; an odd excess is
 * floored, as every centring here is.
 *
 * Either way the drawn size is placed at the anchor, so a non-square cell still registers the artwork
 * where the reader asked.
 */
export function cellPlacements(boxes: readonly SpriteBox[], cell: SpriteCell): readonly SpritePlacement[] {
  const factor = cell.fit === 'SCALE_SET' ? evenScale(boxes, cell) : 1;
  return boxes.map((box) => {
    // Under `IN_PLACE` a piece no cell holds has been refused before the writer reaches here.
    const inPlace = cell.fit === 'IN_PLACE' ? inPlacePlacement(box, cell) : null;
    if (inPlace !== null) return inPlace;
    const { source, width, height } = drawnAt(box, cell, factor);
    return {
      source,
      x: offsetFor(cell.width - width, cell.anchor.x),
      y: offsetFor(cell.height - height, cell.anchor.y),
      width,
      height,
    };
  });
}

/** The region one sprite is cut from and the size it is drawn at, under the cell's fit. */
function drawnAt(
  box: SpriteBox,
  cell: SpriteCell,
  factor: number,
): { readonly source: SheetRegion; readonly width: number; readonly height: number } {
  const region = { left: box.left, top: box.top, width: box.width, height: box.height };
  if (cell.fit === 'REFUSE' || cell.fit === 'IN_PLACE') {
    return { source: region, width: box.width, height: box.height };
  }
  if (cell.fit === 'SCALE_SET') {
    return {
      source: region,
      width: Math.min(cell.width, Math.max(1, Math.round(box.width * factor))),
      height: Math.min(cell.height, Math.max(1, Math.round(box.height * factor))),
    };
  }
  const side = Math.min(box.width, box.height);
  const fill = Math.min(cell.width, cell.height);
  return {
    source: {
      left: box.left + offsetFor(box.width - side, 'CENTRE'),
      top: box.top + offsetFor(box.height - side, 'MIDDLE'),
      width: side,
      height: side,
    },
    width: fill,
    height: fill,
  };
}

/**
 * The point on a sprite's own box that the artwork was registered against, in the box's own pixels.
 *
 * This is what a cell's pivot is: the reader named an anchor because that is where the piece joins
 * whatever carries it, so the pivot is that same point rather than a second convention beside it.
 * A point on the *box* rather than in the cell, because that is what a manifest states about a
 * sprite on a sheet — `ManifestSprite.placement` is what moves it into a cell. Under `FILL_SQUARE`
 * the box is the square that was cut rather than the whole bounding box, since that square is the
 * artwork the cell holds.
 *
 * At the default anchor — bottom-centre — it produces exactly the foot-of-the-box figure
 * `buildManifest` stated before a cell could be asked for, which is what keeps the two cuts
 * describing one quantity.
 */
export function cellPivot(box: SheetRegion, anchor: SpriteCell['anchor']): { x: number; y: number } {
  return {
    x: box.left + offsetFor(box.width, anchor.x),
    y: box.top + offsetFor(box.height, anchor.y),
  };
}

/**
 * Why a pack could not be cut into this cell, as the sentence the refusal is reported with.
 *
 * Names the first offender and counts the rest, because a sheet drawn one step too coarse puts every
 * piece over at once and a list of fifteen would say no more than the first does.
 *
 * **The offender is named, not numbered**, and that is a correction rather than a flourish. The
 * sentence used to carry the piece's position, described as the number a reader could find in the
 * preview's Sprites mode — which held while the pieces *were* the sprites. They came apart when a
 * reader gained the ability to leave one out or join two: a sheet with sprite 2 left out numbers its
 * fourth piece 4 while the chip over that artwork reads 5, so the sentence sent the reader to a
 * sprite that fits the cell perfectly. The name is what the preview's own chip shows, so it points
 * at the artwork either way.
 */
export function oversizeReason(
  boxes: readonly SpriteBox[],
  names: readonly string[],
  cell: SpriteCell,
  over: readonly number[],
): string {
  const first = over[0];
  const box = first === undefined ? undefined : boxes[first];
  if (first === undefined || box === undefined) return '';
  if (cell.lattice?.kind === 'FAILED') return `the sheet’s cells could not be read: ${cell.lattice.reason}`;
  const rest = over.length - 1;
  const others = rest === 0 ? '' : ` and ${String(rest)} more ${rest === 1 ? 'does' : 'do'} not fit either`;
  // The positional name a sheet that could not be named falls back to is itself `sprite-04`, so the
  // clause reads the same way whether the sheet is named or numbered.
  const named = names[first] ?? `piece ${String(first + 1)}`;
  if (cell.fit === 'IN_PLACE') {
    return `${named} reaches past its ${String(cell.width)} × ${String(cell.height)} cell where it was drawn${others} — re-generate the sheet with each piece inside its tile square`;
  }
  return `${named} is ${String(box.width)} × ${String(box.height)} drawn pixels, larger than the ${String(cell.width)} × ${String(cell.height)} cell${others} — raise the cell, or re-generate the sheet at the scale the prompt asked for`;
}

/**
 * The pieces of a placement sheet that do not land inside the cell under `IN_PLACE`: every piece where
 * the cells could not be read, and otherwise each piece no cell holds or whose place reaches past the
 * file's edge. A piece drawn across its tile square's edge is refused rather than clipped, because the
 * part the clip would take is part of the mark.
 */
function outOfPlace(boxes: readonly SpriteBox[], cell: SpriteCell): readonly number[] {
  if (cell.lattice?.kind !== 'CELLS') return boxes.map((_box, index) => index);
  return boxes.flatMap((box, index) => {
    const placed = inPlacePlacement(box, cell);
    const inside =
      placed !== null &&
      placed.x >= 0 &&
      placed.y >= 0 &&
      placed.x + placed.width <= cell.width &&
      placed.y + placed.height <= cell.height;
    return inside ? [] : [index];
  });
}
