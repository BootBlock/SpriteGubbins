import { PROXY_CROP_STRIDE } from '../constants/autoTune.ts';
import { cropImage } from './cropImage.ts';
import { integralImage, rectangleSum } from './integralImage.ts';
import { lumaPlane } from './lumaPlane.ts';

/** One window of the sheet, and where on the sheet it came from. */
export interface ProxyCrop {
  readonly left: number;
  readonly top: number;
  readonly image: ImageData;
}

/**
 * The busiest few windows of the sheet, for a sweep that cannot afford to read all of it.
 *
 * The auto-tune sweep runs the whole pipeline once per candidate, and the tab admits a sheet of 16.8
 * million pixels — so what it reads has to be a sample. **Busyness is what decides which sample**,
 * because every dial being swept is about detail: which reading keeps a contour, how far the outline
 * expansion has to grow it, what the merge folds and what the cleanup snaps. A window of flat field
 * answers all of those identically and would rank every candidate the same.
 *
 * Busyness is measured as the summed absolute step between neighbouring pixels, right and down, over
 * the alpha-weighted luma — the same quantity the grid readers weigh, and for the same reason: a
 * boundary is where the image changes. A summed-area table answers every window in constant time, so
 * the choice costs two passes over the sheet however many windows are considered.
 *
 * **Every window starts and ends on the grid's own lattice.** The pipeline measures its mesh from
 * whatever image it is handed, so a crop cut mid-cell would hand it a sheet whose first cell is a
 * fragment — and the dials chosen on that are chosen against a mesh the whole sheet does not have.
 * Aligning the origin does not guarantee the crop's mesh matches the sheet's, because the sheet's
 * own lattice may be phased or drifting; what it guarantees is that every candidate meets the *same*
 * mesh, which is what makes the ranking between them sound.
 *
 * The windows are non-overlapping, so three crops are three samples rather than three views of one
 * busy corner. Where the sheet cannot hold as many as were asked for, it returns what it has —
 * possibly one — and an empty list only where the sheet is smaller than a single cell, which is the
 * one case the sweep genuinely cannot proceed from.
 */
export function proxyCrops(
  image: ImageData,
  grid: number,
  cells: number,
  count: number,
): readonly ProxyCrop[] {
  // Cut to whole cells first: the last part-cell of a sheet is not a place a window may end.
  const usableWidth = Math.floor(image.width / grid) * grid;
  const usableHeight = Math.floor(image.height / grid) * grid;
  if (usableWidth < grid || usableHeight < grid) return [];

  const edge = Math.min(cells * grid, usableWidth, usableHeight);
  const stride = Math.max(grid, Math.floor((edge * PROXY_CROP_STRIDE) / grid) * grid);

  const busyness = integralImage(stepPlane(image), image.width, image.height);
  const windows: { readonly left: number; readonly top: number; readonly energy: number }[] = [];
  for (let top = 0; top + edge <= usableHeight; top += stride) {
    for (let left = 0; left + edge <= usableWidth; left += stride) {
      windows.push({
        left,
        top,
        energy: rectangleSum(busyness, image.width, left, top, edge, edge),
      });
    }
  }

  // Busiest first, and reading order between equals — so a flat sheet, where every window scores the
  // same, still returns the same three crops on every press rather than whatever the sort settled on.
  windows.sort((a, b) => b.energy - a.energy || a.top - b.top || a.left - b.left);

  const chosen: ProxyCrop[] = [];
  for (const window of windows) {
    if (chosen.length >= count) break;
    const overlaps = chosen.some(
      (taken) =>
        window.left < taken.left + edge &&
        taken.left < window.left + edge &&
        window.top < taken.top + edge &&
        taken.top < window.top + edge,
    );
    if (overlaps) continue;
    chosen.push({
      left: window.left,
      top: window.top,
      image: cropImage(image, window.left, window.top, edge, edge),
    });
  }
  return chosen;
}

/**
 * How much each pixel differs from the pixel right of it and the pixel below it.
 *
 * The far column and the far row have no such neighbour and contribute their one available step,
 * which is what a forward difference does at an edge — never a wrap, which would read the opposite
 * side of the sheet as detail.
 */
function stepPlane(image: ImageData): Float64Array {
  const { width, height } = image;
  const luma = lumaPlane(image);
  const steps = new Float64Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const here = luma[y * width + x] ?? 0;
      const right = x + 1 < width ? (luma[y * width + x + 1] ?? 0) : here;
      const below = y + 1 < height ? (luma[(y + 1) * width + x] ?? 0) : here;
      steps[y * width + x] = Math.abs(right - here) + Math.abs(below - here);
    }
  }
  return steps;
}
