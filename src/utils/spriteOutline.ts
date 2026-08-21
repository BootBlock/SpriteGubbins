import { SPRITE_MARKER } from '../constants/spriteMarker.ts';
import type { Rgba, SpriteBox } from '../types/quantiser.ts';
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
 * Pure, and one pass over a result that is `grid²` times smaller than the sheet — except at a grid
 * of 1, where it is the sheet. Written for that case: the copy is a single `set` of the whole
 * channel array rather than a per-pixel loop, and only the perimeters are walked after it.
 */
export function outlineSprites(image: ImageData, boxes: readonly SpriteBox[]): ImageData {
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

  return outlined;
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

/** What an unreachable index would resolve to — see the note at its one use. */
const DARK: Rgba = { r: 0, g: 0, b: 0, a: FULLY_OPAQUE };
