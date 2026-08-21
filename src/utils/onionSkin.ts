import type { AlignedFrame, PixelShift, SpriteStrip } from '../types/quantiser.ts';
import { FULLY_TRANSPARENT, createImage, pixelOffset } from './imageData.ts';

/**
 * The result with each strip's frames stacked on its first slot — the preview's answer to "does this
 * row hold still".
 *
 * A drift of two drawn pixels is a number in a list. Laid over one another the same two pixels are a
 * doubled contour, which is what a reader is actually going to see when the row plays — and it is
 * the reason this mode exists rather than a wider column in the panel. It is the same argument the
 * difference heatmap was built on, one reading further along: the figure says a dial did something
 * and the picture says what.
 *
 * **Each frame is translated by its own slot, never by its measured position.** Translating by where
 * a frame *is* would register the stack perfectly by construction — every frame crisp, on every
 * sheet, saying nothing. Translating by where the row's spacing says it *should* be leaves exactly
 * the residue the panel is reporting, so a strip already on its pitch comes out as one clean figure
 * and a frame that wandered comes out beside it as a ghost. Under `SNAP` the ghosts converge as the
 * frames are moved, which is the feedback the tolerance dial is tuned against.
 *
 * The slot comes from {@link AlignedFrame.slot} rather than from the strip's pitch, and that is not
 * a convenience: the pitch is fractional, and rounding it here as well as in the reading is exactly
 * how a stack comes to sit one pixel from the drift the panel beside it is reporting.
 *
 * **A frame that has already been moved is read where it now is.** This runs on the finished sheet,
 * so a snapped frame's pixels sit at its slot rather than at the box the reading recorded — see
 * {@link AlignedFrame}, whose figures deliberately describe the sheet as it stood before the move.
 *
 * **Averaged with alpha as the weight, and every frame counted whether it covers the pixel or not.**
 * The denominator is the frame count everywhere in the stack, so a contour only one frame of eight
 * draws comes out at an eighth of its coverage — faint, which is what a ghost is. Excluding the
 * frames that miss would instead draw that contour solid and the stack would read as though every
 * frame agreed about it. Colour is weighted by coverage so a half-covered edge does not drag the
 * mixture toward the black that lies under a cleared pixel.
 *
 * Two things it deliberately is not. It is **not** the sheet dimmed with the stack over it: the rest
 * of the result is left exactly as it is, so the stack sits on the row it belongs to and the reader
 * can see the frames it was made from beside it. And it is **not** clipped away from the second
 * frame's slot — where a row's pitch is narrower than its frames are wide, the stack reaches into
 * the neighbour it is made of. That is a preview drawing over a preview; the download writes the
 * result's own pixels whatever this shows, which is the same concession `outlineSprites` makes for
 * a ring that lands on the sprite next door.
 *
 * Pure, and one copy of a result that is `grid²` times smaller than the sheet, plus one pass over
 * each strip's own stack.
 */
export function onionSkin(image: ImageData, strips: readonly SpriteStrip[]): ImageData {
  const stacked = createImage(image.width, image.height);
  stacked.data.set(image.data);

  for (const strip of strips) {
    const placed = strip.frames.map((frame) => ({
      frame,
      /** Where this frame's pixels are now, and how far back its slot is from the first one's. */
      at: current(frame),
      by: frame.slot,
    }));

    const region = stackRegion(image, placed);
    for (let y = region.top; y < region.bottom; y += 1) {
      for (let x = region.left; x < region.right; x += 1) {
        let coverage = 0;
        let red = 0;
        let green = 0;
        let blue = 0;

        for (const { frame, at, by } of placed) {
          const from = coveredAt(image, frame, at, x + by.x, y + by.y);
          if (from < 0) continue;
          const alpha = image.data[from + 3] ?? 0;
          if (alpha === FULLY_TRANSPARENT) continue;
          coverage += alpha;
          red += (image.data[from] ?? 0) * alpha;
          green += (image.data[from + 1] ?? 0) * alpha;
          blue += (image.data[from + 2] ?? 0) * alpha;
        }

        const to = pixelOffset(image.width, x, y);
        stacked.data[to] = coverage === 0 ? 0 : red / coverage;
        stacked.data[to + 1] = coverage === 0 ? 0 : green / coverage;
        stacked.data[to + 2] = coverage === 0 ? 0 : blue / coverage;
        stacked.data[to + 3] = coverage / placed.length;
      }
    }
  }

  return stacked;
}

/** Where a frame's artwork actually sits on the finished sheet — its box, less any move applied. */
function current(frame: AlignedFrame): PixelShift {
  if (!frame.snapped) return { x: frame.box.left, y: frame.box.top };
  return { x: frame.box.left - frame.drift.x, y: frame.box.top - frame.drift.y };
}

/** One frame of a strip, ready to stack: where its pixels are, and the slot offset to bring it back by. */
interface Placed {
  readonly frame: AlignedFrame;
  readonly at: PixelShift;
  readonly by: PixelShift;
}

/** The pixels a stack covers, as half-open bounds on the sheet. */
interface StackRegion {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/**
 * Where a frame's pixel lives, or `-1` where this frame does not cover the position at all.
 *
 * The bound is the frame's own box rather than the sheet, which is the same rule `registerFrame`
 * reads under and for the same reason: a position outside it belongs to some other sprite, and
 * folding a neighbour's pixels into the stack would draw a second figure through the first.
 */
function coveredAt(image: ImageData, frame: AlignedFrame, at: PixelShift, x: number, y: number): number {
  if (x < at.x || x >= at.x + frame.box.width) return -1;
  if (y < at.y || y >= at.y + frame.box.height) return -1;
  return pixelOffset(image.width, x, y);
}

/**
 * Every pixel the stack covers, clipped to the sheet.
 *
 * The union of the frames' boxes brought back to the first slot, rather than the first frame's box
 * alone: a frame that drifted, or one drawn a little larger, reaches past what the first one covers,
 * and a stack clipped to the first frame would hide the very overhang it exists to show.
 */
function stackRegion(image: ImageData, placed: readonly Placed[]): StackRegion {
  let left = image.width;
  let top = image.height;
  let right = 0;
  let bottom = 0;

  for (const { frame, at, by } of placed) {
    left = Math.min(left, at.x - by.x);
    top = Math.min(top, at.y - by.y);
    right = Math.max(right, at.x - by.x + frame.box.width);
    bottom = Math.max(bottom, at.y - by.y + frame.box.height);
  }

  return {
    left: Math.max(0, left),
    top: Math.max(0, top),
    right: Math.min(image.width, right),
    bottom: Math.min(image.height, bottom),
  };
}
