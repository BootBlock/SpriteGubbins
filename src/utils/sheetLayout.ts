import type { SpriteBox } from '../types/quantiser.ts';

/**
 * Turning one quantised sheet into the frames and tags an animation file is made of.
 *
 * **This is the design question the `.aseprite` export raises, and this file is the answer.** A PNG
 * of a sheet is one picture and needs no such decision; an Aseprite document is a canvas, a list of
 * frames and a list of tags naming ranges of them, and nothing in the app had ever been asked where
 * those come from.
 *
 * - **A frame is a sprite.** `spriteSegments.ts` labels the connected opaque regions of a finished
 *   result and hands back one box per sprite — the same boxes the preview's `SPRITES` mode draws a
 *   ring around. That is the only thing this app knows about where one sprite ends and the next
 *   begins, so it is what the frames are cut from. Anything else would be a second, quieter answer
 *   to a question already answered on screen.
 * - **A tag is a strip.** Boxes are grouped into strips by vertical overlap, chained, so a row of
 *   sprites at differing heights stays one row. Frames are then ordered strip by strip, which is
 *   what makes each tag the contiguous `[from, to]` range the format requires — a tag cannot name a
 *   scattered set of frames, so the grouping has to happen before the ordering rather than after.
 * - **The canvas is the largest sprite**, since one canvas has to seat every frame.
 *
 * **What the placement keeps, and what it cannot.** A sprite's vertical position within its strip is
 * *alignment*: a walk cycle that bobs is drawn bobbing, and preserving `top` relative to the strip's
 * own top is what carries that into the file. Its horizontal position is not alignment, it is the
 * sprite's **place in the sequence** — frames are laid out left to right on a sheet — so carrying it
 * across would march every frame of the animation steadily to the right. The two are inseparable on
 * a sheet without knowing the cell width the artwork was laid out on, which nothing measures, so the
 * honest answer is to keep the axis that means something and centre the one that does not. A sprite
 * that genuinely leans left in one frame and right in the next therefore comes back centred in both,
 * and that is a real loss stated here rather than a defect to find later.
 *
 * **A sheet with nothing to cut is one frame holding all of it.** `SOLID`, `SCATTERED`, and a
 * segmentation that found no boxes at all reach here as an empty list — see `SpriteSegmentation`,
 * which deliberately carries no boxes in the first two — and the file that results is a complete,
 * single-frame document of the whole sheet rather than a refusal or an empty shell.
 *
 * Pure, as everything in this directory is.
 */

/** One frame: where its pixels come from on the sheet, and where the cel sits in the canvas. */
export interface SheetFrame {
  /** The region of the sheet this frame is cut from, in drawn pixels. */
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  /** Where the cel is placed in the canvas — see the note above on which axis is preserved. */
  readonly x: number;
  readonly y: number;
}

/** One strip of the sheet, as the tag naming the run of frames it became. */
export interface SheetStrip {
  readonly name: string;
  /** The first frame of the run, counting from zero. */
  readonly from: number;
  /** The last frame of the run, inclusive, as the format's own `To frame` field is. */
  readonly to: number;
}

/** The canvas, its frames in order, and the tags naming the runs within them. */
export interface SheetLayout {
  readonly width: number;
  readonly height: number;
  readonly frames: readonly [SheetFrame, ...SheetFrame[]];
  /** Empty where the sheet held nothing to cut, which is the single-frame case. */
  readonly strips: readonly SheetStrip[];
}

/** The canvas, frames and tags one sheet and its sprite boxes come to. */
export function sheetLayout(image: ImageData, boxes: readonly SpriteBox[]): SheetLayout {
  if (boxes.length === 0) {
    return {
      width: image.width,
      height: image.height,
      frames: [{ left: 0, top: 0, width: image.width, height: image.height, x: 0, y: 0 }],
      strips: [],
    };
  }

  const strips = groupIntoStrips(boxes);
  const width = strips.reduce(
    (widest, strip) => strip.reduce((row, box) => Math.max(row, box.width), widest),
    1,
  );
  // The tallest band any strip occupies: a frame keeps its offset within its own strip, so the
  // canvas has to be tall enough for the deepest of them rather than for the tallest single sprite.
  const height = strips.reduce((tallest, strip) => Math.max(tallest, bandBottom(strip) - bandTop(strip)), 1);

  const frames: SheetFrame[] = [];
  const tags: SheetStrip[] = [];
  for (const [index, strip] of strips.entries()) {
    const top = bandTop(strip);
    const from = frames.length;
    for (const box of strip) {
      frames.push({
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        // Centred across, kept where it was down — see the note at the top of the file.
        x: Math.floor((width - box.width) / 2),
        y: box.top - top,
      });
    }
    tags.push({ name: stripName(index), from, to: frames.length - 1 });
  }

  const [first, ...rest] = frames;
  // Unreachable while `boxes` is non-empty — every box becomes exactly one frame — and answered
  // rather than asserted away, because the tuple type is what lets the writer emit its first frame
  // without a runtime check of its own.
  if (first === undefined) throw new Error('A sheet with sprites on it produced no frames');
  return { width, height, frames: [first, ...rest], strips: tags };
}

/**
 * The boxes as they sit on a sheet magnified by a whole number.
 *
 * Segmentation runs on the 1:1 result and the file may be written magnified, so the two have to be
 * brought onto one set of coordinates. Multiplying is exact rather than approximate because
 * `upscaleNearest` draws each pixel as a `scale × scale` block: the bounding box of the block form
 * of a region is the bounding box of the region, scaled.
 */
export function scaleBoxes(boxes: readonly SpriteBox[], scale: number): readonly SpriteBox[] {
  if (scale === 1) return boxes;
  return boxes.map((box) => ({
    left: box.left * scale,
    top: box.top * scale,
    width: box.width * scale,
    height: box.height * scale,
    pixels: box.pixels * scale * scale,
  }));
}

/** What each strip's tag is called, numbered from one as a reader counts rows down a sheet. */
function stripName(index: number): string {
  return `Row ${String(index + 1)}`;
}

/**
 * Boxes gathered into rows, each row in left-to-right order and the rows themselves top to bottom.
 *
 * A box joins the open row where it overlaps that row's vertical band, and the band grows to include
 * it — so a tall sprite in the middle of a row pulls in the shorter ones on either side of it, and a
 * row of figures whose heads are at different heights stays one row. `spriteSegments` returns boxes
 * in reading order, topmost first, which is what makes one pass over them enough: a box that does
 * not reach the open band cannot reach any band opened before it either.
 */
function groupIntoStrips(boxes: readonly SpriteBox[]): SpriteBox[][] {
  const strips: SpriteBox[][] = [];
  let open: SpriteBox[] | null = null;

  for (const box of boxes) {
    if (open === null || box.top >= bandBottom(open)) {
      open = [box];
      strips.push(open);
      continue;
    }
    open.push(box);
  }

  return strips.map((strip) => [...strip].sort((left, right) => left.left - right.left));
}

/** The first row of a strip's band — the topmost edge of any box in it. */
function bandTop(strip: readonly SpriteBox[]): number {
  return strip.reduce((highest, box) => Math.min(highest, box.top), Number.POSITIVE_INFINITY);
}

/** The first row past a strip's band — the lowest edge of any box in it. */
function bandBottom(strip: readonly SpriteBox[]): number {
  return strip.reduce((lowest, box) => Math.max(lowest, box.top + box.height), 0);
}
