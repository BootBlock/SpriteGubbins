import { SPRITE_MARKER } from '../constants/spriteMarker.ts';
import type { Rgba, SpriteBox, SpriteSymmetry } from '../types/quantiser.ts';
import { FULLY_OPAQUE, createImage, pixelOffset, writePixel } from './imageData.ts';
import { oklabToSrgb, oklchToOklab } from './oklab.ts';

/**
 * The result with each sprite's bounds marked — the preview's answer to "what did it find".
 *
 * A count of sprites nobody can see the extent of is the unreadable dial the difference heatmap was
 * built to fix, arriving in a different place: "12 sprites" and "1 sprite" are the same sentence to
 * a reader who cannot tell which pieces of their sheet were grouped, and the gap dial that decides
 * it would be tuned by guessing. This draws what was counted.
 *
 * **The outline sits one pixel *outside* the box**, so no drawn pixel of the artwork is overwritten
 * by the mark describing it — a box drawn on its own boundary would replace the sprite's own edge
 * with the line claiming to measure it, which is the one pixel a reader checking the bounds is
 * looking at. It is clipped to the image, so a sprite touching an edge simply loses the side that
 * would fall off it.
 *
 * **Two colours alternating along the run**, chosen by `(x + y)` parity so a horizontal side and a
 * vertical side both dash rather than one of them coming out solid. See {@link SPRITE_MARKER} for
 * why they are the ones they are.
 *
 * Where two sprites sit within a pixel of one another, one's outline lands on the other's artwork.
 * That is left as it is: this view exists to be read rather than downloaded — the Download button
 * writes the result's own pixels whatever the preview is showing — and a mark that stopped at an
 * occupied pixel would break exactly where a reader checking the boundary is looking.
 *
 * **Each sprite's mirror axis is marked in the same pass, where one was measured**, as a solid
 * pixel *in* the ring, top and bottom. It is a mark rather than a line down the sprite because the
 * rule this file opens with does not bend for it: an axis drawn where it actually runs would replace
 * the artwork the reader is trying to judge it against, and a column of pixels is exactly what a
 * symmetry check is being read at. Solid rather than dashed is what makes it a mark at all, since
 * the ring alternates the two stops pixel by pixel.
 *
 * **It sits on the ring rather than a row beyond it**, and that is a correction rather than a taste:
 * two sprites may be a single pixel apart, so a mark a second row out lands on the *next sprite's
 * artwork* — in a case the ring itself would have cleared. The concession this file makes about
 * overlap covers a ring one pixel out and nothing wider, so the axis mark stays inside it.
 *
 * A half-pixel axis marks the two columns it runs between, so the seam the pair straddles is the
 * answer; a whole-pixel axis marks the one column it runs down. The panel carries the figure to a
 * tenth of a pixel — this says where.
 *
 * Pure, and one pass over a result that is `grid²` times smaller than the sheet — except at a grid
 * of 1, where it is the sheet. Written for that case: the copy is a single `set` of the whole
 * channel array rather than a per-pixel loop, and only the perimeters are walked after it.
 */
export function outlineSprites(
  image: ImageData,
  boxes: readonly SpriteBox[],
  axes: readonly SpriteSymmetry[],
): ImageData {
  const outlined = createImage(image.width, image.height);
  outlined.data.set(image.data);

  for (const box of boxes) {
    // The ring one pixel out, in inclusive coordinates. Clipping happens per pixel rather than by
    // narrowing these, because a box against an edge needs three of its four sides drawn in full
    // and only the fourth dropped — narrowing the ring would shrink the sides that do fit.
    const left = box.left - 1;
    const top = box.top - 1;
    const right = box.left + box.width;
    const bottom = box.top + box.height;

    for (let x = left; x <= right; x += 1) {
      mark(outlined, x, top);
      mark(outlined, x, bottom);
    }
    // The corners belong to the horizontal runs above, so the vertical ones start inside them —
    // marking a corner twice is harmless, but the parity would then be decided twice for one pixel
    // and the reasoning about where the dash falls would stop being local.
    for (let y = top + 1; y < bottom; y += 1) {
      mark(outlined, left, y);
      mark(outlined, right, y);
    }
  }

  for (const { box, axis } of axes) {
    // The columns the mirror line runs down, or the two it runs between. `2 × axis` is the doubled
    // coordinate the search works in, so an odd value is a seam and marks both sides of it.
    const doubled = Math.round(2 * axis);
    const columns = doubled % 2 === 0 ? [doubled / 2] : [(doubled - 1) / 2, (doubled + 1) / 2];
    for (const column of columns) {
      tick(outlined, column, box.top - 1);
      tick(outlined, column, box.top + box.height);
    }
  }

  return outlined;
}

/** One pixel of the axis mark — solid in the lighter stop, so it reads apart from the dashed ring. */
function tick(image: ImageData, x: number, y: number): void {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  writePixel(image.data, pixelOffset(image.width, x, y), LIGHT);
}

/** One pixel of the outline, in whichever of the two marker colours its position falls on. */
function mark(image: ImageData, x: number, y: number): void {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  // `?? DARK` is unreachable — `MARKERS` is a fixed pair and the index is a parity — and is what
  // `noUncheckedIndexedAccess` asks for on a computed index, as `heatmapImage`'s ramp carries too.
  writePixel(image.data, pixelOffset(image.width, x, y), MARKERS[(x + y) % 2] ?? DARK);
}

/**
 * The marker colours as sRGB, resolved once at module load.
 *
 * Two colours rather than a ramp, so there is nothing to interpolate: `oklchToOklab` and
 * `oklabToSrgb` are the same pair `heatmapImage` uses to bring a token's `oklch()` triple into pixel
 * data, and they run twice here rather than five hundred times.
 */
const MARKERS: readonly Rgba[] = SPRITE_MARKER.map(({ oklch }) =>
  oklabToSrgb(oklchToOklab(oklch[0], oklch[1], oklch[2])),
);

/** What an unreachable index would resolve to — see the note where the ring reads the pair. */
const DARK: Rgba = { r: 0, g: 0, b: 0, a: FULLY_OPAQUE };

/**
 * The lighter of the two marker stops, which is what an axis tick is drawn solid in.
 *
 * The second entry of {@link SPRITE_MARKER} by position, and named here rather than indexed at the
 * call site so the choice is stated once: the tick has to separate from the ring it sits beside, and
 * the ring alternates both stops — so a tick in the darker one would be indistinguishable from a
 * dash wherever the parity happened to agree.
 */
const LIGHT: Rgba = MARKERS[1] ?? DARK;
