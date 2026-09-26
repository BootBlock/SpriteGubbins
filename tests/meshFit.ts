import { forEachMeshCell } from '../src/utils/forEachMeshCell.ts';
import { CHANNELS_PER_PIXEL } from '../src/utils/imageData.ts';
import type { GridMesh } from '../src/types/quantiser.ts';

/**
 * How well a mesh's cells fit the art they cut, scored two ways — the two scores the mesh patches
 * were chosen by.
 *
 * Both compare each pixel with the mean of its own cell over all four channels, and both count only
 * pixels the art covers. A cell that straddles a boundary of the art holds two colours and its mean
 * is neither of them, so either score falls when a mesh cuts across the art's own cells.
 *
 * - {@link cellDeviation} is the proxy, for a sheet whose truth is unknown: the mean L1 distance of
 *   each opaque pixel from its cell's mean, lower being better. It favours smaller cells, so a
 *   comparison states the count of cells beside it.
 * - {@link truthAgreement} is the ground truth, for a sheet built with one: the share of truly
 *   opaque pixels whose cell mean lies within {@link AGREEMENT_DISTANCE} of the colour the art was
 *   drawn with, higher being better.
 *
 * In `tests/` because they are measurements for the figure suites and the corpus, not anything the
 * app computes.
 */

/** How far, in summed channel steps, a cell mean may sit from the drawn colour and still agree. */
const AGREEMENT_DISTANCE = 60;

/** A score, and how many cells hold a pixel it counted. */
export interface MeshFit {
  readonly score: number;
  readonly cells: number;
}

/** The mean within-cell L1 deviation of `image`'s opaque pixels under `mesh`. */
export function cellDeviation(image: ImageData, mesh: GridMesh): MeshFit {
  return fit(image, image, mesh, (distance) => distance, 1);
}

/** The percentage of `truth`'s opaque pixels whose cell mean in `image` agrees with them. */
export function truthAgreement(image: ImageData, truth: ImageData, mesh: GridMesh): MeshFit {
  return fit(image, truth, mesh, (distance) => (distance <= AGREEMENT_DISTANCE ? 1 : 0), 100);
}

function fit(
  image: ImageData,
  reference: ImageData,
  mesh: GridMesh,
  count: (distance: number) => number,
  scale: number,
): MeshFit {
  let total = 0;
  let pixels = 0;
  let cells = 0;
  const mean = [0, 0, 0, 0];
  forEachMeshCell(mesh, image.width, image.height, (_column, _row, left, top, right, bottom) => {
    mean.fill(0);
    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        const at = (y * image.width + x) * CHANNELS_PER_PIXEL;
        for (let channel = 0; channel < 4; channel += 1) {
          mean[channel] = (mean[channel] ?? 0) + (image.data[at + channel] ?? 0);
        }
      }
    }
    const area = (right - left) * (bottom - top);
    let counted = false;
    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        const at = (y * image.width + x) * CHANNELS_PER_PIXEL;
        if ((reference.data[at + 3] ?? 0) === 0) continue;
        let distance = 0;
        for (let channel = 0; channel < 4; channel += 1) {
          distance += Math.abs((reference.data[at + channel] ?? 0) - (mean[channel] ?? 0) / area);
        }
        total += count(distance);
        pixels += 1;
        counted = true;
      }
    }
    if (counted) cells += 1;
  });
  return { score: pixels === 0 ? 0 : (scale * total) / pixels, cells };
}
