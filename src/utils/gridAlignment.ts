import type { GridOffset, PixelGrid } from '../types/quantiser.ts';
import { createImage, packedColorAt, pixelOffset, writePackedColor } from './imageData.ts';

/**
 * Snapping an image to a pixel scale, and reducing it to one pixel per drawn pixel.
 *
 * The transforms that act on the answer `detectPixelGrid` gives, or on the one the user typed,
 * at the offset `bestGridOffset` measured for it. Both return a new `ImageData` and mutate nothing
 * they were given, and both take a `grid` of at least 1 — detection answers 2 or more, and the
 * manual control is bounded by `MANUAL_GRID_RANGE`.
 *
 * The two must agree about where every cell begins, or the reduction samples pixels the alignment
 * never resolved — which is why {@link cellStarts} is the one place a cell boundary is computed,
 * and both walk what it returns.
 */

/**
 * Where each cell begins on one axis: `0`, then every lattice line `offset + k × grid` inside the
 * image.
 *
 * An offset of zero is the corner-anchored lattice and yields the familiar `0, grid, 2·grid, …`.
 * A non-zero offset adds a **leading partial cell** `[0, offset)` before the first lattice line,
 * exactly as an axis whose length is not a multiple of the grid has always had a trailing one:
 * cropping either would silently delete a strip of the sheet, and the art a generator inset from
 * the corner is no more disposable than the art it cut short at the far edge.
 */
function cellStarts(extent: number, grid: PixelGrid, offset: number): number[] {
  const starts: number[] = [];
  if (offset > 0) starts.push(0);
  for (let start = offset; start < extent; start += grid) starts.push(start);
  return starts;
}

/**
 * The same image with every cell reduced to one colour — the cell's **modal** colour, ties going to
 * the pixel nearest the cell's centre.
 *
 * Modal rather than mean, because an average **invents a colour that was not in the image** — the
 * opposite of what a palette-limited sprite wants, and the thing that makes a resized render look
 * resized.
 *
 * **The tie-break is the smooth-art case, not a technicality.** A genuinely gridded cell has a
 * majority and never reaches it. In smooth artwork every pixel of a cell is subtly different, so
 * every colour ties at one vote — and "first in scan order" resolved that to the cell's **top-left
 * corner**, the one pixel guaranteed to sit on the boundary between the art's own blocks, in the
 * anti-aliasing fringe. A whole sheet of such cells came back speckled with edge-blend colours.
 * The pixel nearest the cell's centre is the pixel furthest from every boundary, which is what a
 * representative of the cell means; where two colours tie on distance as well, the earlier in scan
 * order keeps the cell, so the result is deterministic on every input.
 *
 * **Idempotent at the same grid and offset**: after this each cell is already one colour, so
 * running it again changes nothing — the clearest single check that the step did what it claims,
 * and the tests pin it. Partial cells at either end of an axis are aligned too, over whatever they
 * contain; see {@link cellStarts}.
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
export function alignToGrid(image: ImageData, grid: PixelGrid, offset: GridOffset): ImageData {
  const output = createImage(image.width, image.height);
  const counts = new Map<number, number>();
  const distances = new Map<number, number>();
  const columns = cellStarts(image.width, grid, offset.x);
  const rows = cellStarts(image.height, grid, offset.y);

  for (const [rowIndex, top] of rows.entries()) {
    const bottom = Math.min(rows[rowIndex + 1] ?? image.height, image.height);
    for (const [columnIndex, left] of columns.entries()) {
      const right = Math.min(columns[columnIndex + 1] ?? image.width, image.width);
      const color = modalColor(image, counts, distances, left, top, right, bottom);

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
 * The most frequent colour in one cell as a packed value — ties resolved towards the cell's centre,
 * then by scan order.
 *
 * Takes the two tallies it counts into rather than making them, and leaves both empty for the next
 * cell. The caller owns them because the caller is the loop that would otherwise allocate two per
 * cell.
 *
 * The winner is picked after the count rather than during it, because the distance half of the
 * comparison is only final once the whole cell has voted: a colour's nearest occurrence to the
 * centre can arrive on its last pixel. Iteration order over the tally is insertion order, which is
 * scan order — the determinism every tie below ultimately rests on.
 */
function modalColor(
  image: ImageData,
  counts: Map<number, number>,
  distances: Map<number, number>,
  left: number,
  top: number,
  right: number,
  bottom: number,
): number {
  counts.clear();
  distances.clear();
  const centreX = (left + right - 1) / 2;
  const centreY = (top + bottom - 1) / 2;

  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const key = packedColorAt(image.data, pixelOffset(image.width, x, y));
      counts.set(key, (counts.get(key) ?? 0) + 1);
      const distance = (x - centreX) * (x - centreX) + (y - centreY) * (y - centreY);
      const nearest = distances.get(key);
      if (nearest === undefined || distance < nearest) distances.set(key, distance);
    }
  }

  let winner = 0;
  let winningCount = 0;
  let winningDistance = Infinity;
  for (const [key, count] of counts) {
    const distance = distances.get(key) ?? Infinity;
    // Strictly greater on the count and strictly nearer on the tie, so an earlier colour keeps the
    // cell when both halves tie — which is what makes every cell resolve the same way on every run.
    if (count > winningCount || (count === winningCount && distance < winningDistance)) {
      winner = key;
      winningCount = count;
      winningDistance = distance;
    }
  }

  return winner;
}

/**
 * One pixel per cell, taken from the cell's own top-left corner as {@link cellStarts} places the
 * cells.
 *
 * After {@link alignToGrid} at the same grid and offset every pixel in a cell is identical, so this
 * is exact rather than a sampling choice — upscaling each output pixel back over its own cell
 * reproduces the aligned image. Partial cells at either end are kept: cropping them would silently
 * delete a strip of any sheet whose art does not happen to sit flush with the lattice.
 */
export function downscaleNearest(image: ImageData, grid: PixelGrid, offset: GridOffset): ImageData {
  const columns = cellStarts(image.width, grid, offset.x);
  const rows = cellStarts(image.height, grid, offset.y);
  const output = createImage(columns.length, rows.length);

  for (const [y, top] of rows.entries()) {
    for (const [x, left] of columns.entries()) {
      const color = packedColorAt(image.data, pixelOffset(image.width, left, top));
      writePackedColor(output.data, pixelOffset(columns.length, x, y), color);
    }
  }

  return output;
}
