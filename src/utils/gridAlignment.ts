import type { PixelGrid } from '../types/quantiser.ts';
import { createImage, packedColorAt, pixelOffset, writePackedColor } from './imageData.ts';

/**
 * Snapping an image to a pixel scale, and reducing it to one pixel per drawn pixel.
 *
 * The transforms that act on the answer `detectPixelGrid` gives, or on the one the user typed.
 * Both return a new `ImageData` and mutate nothing they were given, and both take a `grid` of at
 * least 1 — detection answers 2 or more, and the manual control is bounded by `MANUAL_GRID_RANGE`.
 */

/**
 * The same image with every `grid × grid` cell reduced to one colour: the cell's **modal** colour,
 * the one the most pixels in it already carry.
 *
 * Modal rather than mean, because an average **invents a colour that was not in the image** — the
 * opposite of what a palette-limited sprite wants, and the thing that makes a resized render look
 * resized. Where every pixel in a cell is unique, as in smooth artwork, the modal colour is simply
 * the first in scan order and the palette step afterwards is what collapses the result.
 *
 * **Idempotent**: after this each cell is already one colour, so running it again changes nothing —
 * the clearest single check that the step did what it claims, and the tests pin it. Cells the image
 * cuts short are aligned too, over whatever they contain; skipping them would leave an unaligned
 * strip down the edge of any sheet whose size is not a multiple of its own grid.
 *
 * **One tally is allocated for the whole image and cleared between cells**, rather than one per cell —
 * which at a grid of 1, where every pixel is its own cell, is 16.8 million `Map`s on the largest sheet
 * the app admits. Measured, that spelling costs *nothing*: V8 scalar-replaces a tally that never
 * escapes, and swapping the two moves the figure by noise in both directions. It is written this way
 * because 16.8 million allocations is not a thing to ask for on the strength of an optimisation that
 * might stop applying — not because it was where the time went.
 *
 * The time went on the **per-pixel colour object**, which is a different claim and a measured one: see
 * the note at the top of `imageData.ts`. Its cost is invisible to a micro-benchmark of this function
 * alone, and that is the trap — `readPixel` is monomorphic there, so the object never escapes either.
 * In the real pipeline, where detection has already run and given those helpers a second call site,
 * escape analysis stops applying and the whole transform goes from about two seconds to about thirty.
 */
export function alignToGrid(image: ImageData, grid: PixelGrid): ImageData {
  const output = createImage(image.width, image.height);
  const counts = new Map<number, number>();

  for (let top = 0; top < image.height; top += grid) {
    for (let left = 0; left < image.width; left += grid) {
      const right = Math.min(left + grid, image.width);
      const bottom = Math.min(top + grid, image.height);
      const color = modalColor(image, counts, left, top, right, bottom);

      for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) {
          writePackedColor(output.data, pixelOffset(image.width, x, y), color);
        }
      }
    }
  }

  return output;
}

/**
 * The most frequent colour in one cell as a packed value, ties going to whichever was met first in
 * scan order.
 *
 * Takes the tally it counts into rather than making one, and leaves it empty for the next cell. The
 * caller owns it because the caller is the loop that would otherwise allocate one per cell.
 */
function modalColor(
  image: ImageData,
  counts: Map<number, number>,
  left: number,
  top: number,
  right: number,
  bottom: number,
): number {
  counts.clear();
  let winner = 0;
  let winningCount = 0;

  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const key = packedColorAt(image.data, pixelOffset(image.width, x, y));
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      // Strictly greater, so an earlier colour keeps the cell on a tie. That is what makes a cell of
      // entirely distinct pixels resolve to the same colour on every run.
      if (count > winningCount) {
        winningCount = count;
        winner = key;
      }
    }
  }

  return winner;
}

/**
 * One pixel per cell, taken from the cell's top-left corner: `⌈w/grid⌉ × ⌈h/grid⌉`.
 *
 * After {@link alignToGrid} every pixel in a cell is identical, so this is exact rather than a
 * sampling choice — upscaling the result reproduces the aligned image pixel for pixel. Trailing
 * partial cells are kept: cropping to a whole multiple of the grid would silently delete a column
 * or row of a sprite sheet.
 */
export function downscaleNearest(image: ImageData, grid: PixelGrid): ImageData {
  const width = Math.ceil(image.width / grid);
  const height = Math.ceil(image.height / grid);
  const output = createImage(width, height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = packedColorAt(image.data, pixelOffset(image.width, x * grid, y * grid));
      writePackedColor(output.data, pixelOffset(width, x, y), color);
    }
  }

  return output;
}
