import type { DifferenceMap, GridMesh } from '../types/quantiser.ts';
import { CHANNELS_PER_PIXEL, FULLY_TRANSPARENT, pixelOffset } from './imageData.ts';
import { DIFFERENCE_PRECISION } from '../constants/quantiser.ts';
import { pixelDistance } from './pixelDistance.ts';
import { srgbToOklabInto } from './oklab.ts';
import type { MutableOklab } from './oklab.ts';

/**
 * How far each output pixel sits from the patch of source it stands for, in scaled OKLab.
 *
 * The quantiser's dials are conservative by design, and that is exactly what makes them hard to
 * judge. On the reference sheet a second cleanup pass moves **404** of 44,099 pixels at the
 * settings `DIFFERENCE_SCALES` is calibrated on, and **62** at the ink-weighted settings the report
 * that raised it was using — and a few hundred pixels a shade apart are invisible in a preview at
 * any magnification a whole sheet fits in. The result pane can say *what* the sheet became and
 * cannot say *what it cost*, so a dial that is working and a dial that is doing nothing look
 * identical, which is the reading two separate user reports arrived at. This is the measurement
 * behind that judgement: one number per output pixel, painted where the pixel is, so a change of
 * half a shade in one corner of the sheet is somewhere to look rather than something to find.
 *
 * **One cell, one number: the mean distance from the cell's own source pixels to the colour that
 * replaced them.** Mean rather than worst, because the question a cell answers is how well it
 * *stands for* the patch — a single stray pixel in a flat cell should not paint the cell as lost —
 * and mean rather than the distance between the two averages, because averaging the source first
 * would let a cell of black and white read as a faithful grey. It is therefore an error the mesh
 * cannot avoid wherever a cell genuinely straddles an edge: silhouettes light up on every sheet,
 * whatever the dials do, and the cells that *move* as a dial turns are the interiors between them.
 *
 * **Measured against the keyed source, not the file as it arrived.** Keying deletes pixels the
 * reader asked to delete, and against the raw file every background cell would report the largest
 * difference there is — burying the reduction this is meant to show under the one part of the
 * pipeline that already has a readout of its own (`QuantiseResult.keyedShare`). The image compared
 * here is the image the mesh, the vote and the palette all worked from.
 *
 * Pure, and shaped like the passes beside it: no allocation per pixel, one scratch colour reused
 * across the whole sheet, and a one-entry cache for the run of identical pixels flat art is made of.
 */
export function differenceMap(source: ImageData, result: ImageData, mesh: GridMesh): DifferenceMap {
  const width = mesh.x.length;
  const height = mesh.y.length;
  const cells = new Uint16Array(width * height);

  const cellColor: MutableOklab = { L: 0, a: 0, b: 0 };
  const sourceColor: MutableOklab = { L: 0, a: 0, b: 0 };
  // The run cache: flat art repeats a colour along a scanline, and re-deriving OKLab for a pixel
  // identical to the one before it is the single most expensive thing this pass could do twice.
  // `-1` is no colour, which no packed value can be.
  let cachedColor = -1;

  let carried = 0;
  let total = 0;
  let peak = 0;

  for (const [row, top] of mesh.y.entries()) {
    const bottom = Math.min(mesh.y[row + 1] ?? source.height, source.height);
    for (const [column, left] of mesh.x.entries()) {
      const right = Math.min(mesh.x[column + 1] ?? source.width, source.width);

      const cell = row * width + column;
      const at = cell * CHANNELS_PER_PIXEL;
      const resultAlpha = result.data[at + 3] ?? 0;
      srgbToOklabInto(cellColor, result.data[at] ?? 0, result.data[at + 1] ?? 0, result.data[at + 2] ?? 0);

      let sum = 0;
      let counted = 0;
      let visible = resultAlpha !== FULLY_TRANSPARENT;

      for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) {
          const from = pixelOffset(source.width, x, y);
          const r = source.data[from] ?? 0;
          const g = source.data[from + 1] ?? 0;
          const b = source.data[from + 2] ?? 0;
          const alpha = source.data[from + 3] ?? 0;
          if (alpha !== FULLY_TRANSPARENT) visible = true;

          const packed = ((r * 256 + g) * 256 + b) * 256 + alpha;
          if (packed !== cachedColor) {
            srgbToOklabInto(sourceColor, r, g, b);
            cachedColor = packed;
          }
          sum += pixelDistance(sourceColor, alpha, cellColor, resultAlpha);
          counted += 1;
        }
      }

      // A mesh cut can land on the image's own edge, which closes a cell over no pixels at all.
      // Nothing was replaced there, so nothing was lost there.
      const mean = counted === 0 ? 0 : sum / counted;
      cells[cell] = Math.round(mean * DIFFERENCE_PRECISION);
      if (mean > peak) peak = mean;
      // Empty on both sides is not a faithful cell, it is an absent one — averaged in, the empty
      // margin around a sprite would drag the sheet's figure towards zero in proportion to how much
      // empty space the artist left, which is the one thing the figure must not measure.
      if (visible) {
        total += mean;
        carried += 1;
      }
    }
  }

  return { width, height, cells, mean: carried === 0 ? 0 : total / carried, peak };
}
