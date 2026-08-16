import { K_CENTROID_PASSES } from '../constants/quantiser.ts';
import type { GridMesh } from '../types/quantiser.ts';
import { createImage, FULLY_OPAQUE, pixelOffset } from './imageData.ts';

/**
 * One pixel per mesh cell, as the centre of the cell's *dominant colour cluster* — the k-centroid
 * reading, the community's general-purpose middle ground between a modal pick and a plain mean.
 *
 * Two clusters per cell, seeded at the cell's darkest and brightest pixels and settled by a few
 * k-means passes: every pixel joins the nearer centre, the centres move to their members' means,
 * and the more populated cluster's centre is the cell. A modal pick lets one exact colour speak
 * for a cell whose surface is really a hundred near-identical shades; a plain mean lets a crossing
 * line bleed into everything; the dominant cluster's *centroid* averages only the surface that
 * actually owns the cell, so it keeps local hue without either failure. Its own known cost is the
 * inverse: a sub-dominant contour loses the cell entirely, which is what the ink-weighted reading
 * is for.
 *
 * Deterministic by construction — extreme-pixel seeds, fixed passes, ties resolved to the darker
 * cluster — and an *averaging* reading, so `quantiseImage` applies the palette step to its output
 * rather than its input. Only fully opaque pixels take part; a cell more than half transparent
 * resolves to transparency, as every reading resolves it.
 */
export function kCentroidCells(image: ImageData, mesh: GridMesh): ImageData {
  const output = createImage(mesh.x.length, mesh.y.length);
  const reds: number[] = [];
  const greens: number[] = [];
  const blues: number[] = [];

  for (const [cellY, top] of mesh.y.entries()) {
    const bottom = Math.min(mesh.y[cellY + 1] ?? image.height, image.height);
    for (const [cellX, left] of mesh.x.entries()) {
      const right = Math.min(mesh.x[cellX + 1] ?? image.width, image.width);

      reds.length = 0;
      greens.length = 0;
      blues.length = 0;
      let darkest = 0;
      let brightest = 0;
      let darkestLuma = 256;
      let brightestLuma = -1;
      for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) {
          const offset = pixelOffset(image.width, x, y);
          if ((image.data[offset + 3] ?? 0) !== FULLY_OPAQUE) continue;
          const r = image.data[offset] ?? 0;
          const g = image.data[offset + 1] ?? 0;
          const b = image.data[offset + 2] ?? 0;
          const index = reds.length;
          reds.push(r);
          greens.push(g);
          blues.push(b);
          const luma = (54 * r + 183 * g + 19 * b) >> 8;
          if (luma < darkestLuma) {
            darkestLuma = luma;
            darkest = index;
          }
          if (luma > brightestLuma) {
            brightestLuma = luma;
            brightest = index;
          }
        }
      }

      const out = pixelOffset(mesh.x.length, cellX, cellY);
      const area = (right - left) * (bottom - top);
      if (reds.length * 2 < area) continue;

      const centre = dominantCentroid(reds, greens, blues, darkest, brightest);
      output.data[out] = centre.r;
      output.data[out + 1] = centre.g;
      output.data[out + 2] = centre.b;
      output.data[out + 3] = FULLY_OPAQUE;
    }
  }

  return output;
}

/** The settled dominant cluster's centre, from seeds at the cell's luma extremes. */
function dominantCentroid(
  reds: readonly number[],
  greens: readonly number[],
  blues: readonly number[],
  darkest: number,
  brightest: number,
): { r: number; g: number; b: number } {
  let aR = reds[darkest] ?? 0;
  let aG = greens[darkest] ?? 0;
  let aB = blues[darkest] ?? 0;
  let bR = reds[brightest] ?? 0;
  let bG = greens[brightest] ?? 0;
  let bB = blues[brightest] ?? 0;

  let aCount = 0;
  let sums = { aR: 0, aG: 0, aB: 0, bR: 0, bG: 0, bB: 0 };
  for (let pass = 0; pass < K_CENTROID_PASSES; pass += 1) {
    sums = { aR: 0, aG: 0, aB: 0, bR: 0, bG: 0, bB: 0 };
    aCount = 0;
    let bCount = 0;
    for (const [index, r] of reds.entries()) {
      const g = greens[index] ?? 0;
      const b = blues[index] ?? 0;
      const toA = (r - aR) ** 2 + (g - aG) ** 2 + (b - aB) ** 2;
      const toB = (r - bR) ** 2 + (g - bG) ** 2 + (b - bB) ** 2;
      // `<=` sends an equidistant pixel to the darker seed's cluster — the deterministic tie, in
      // the direction the app's whole line policy leans.
      if (toA <= toB) {
        sums.aR += r;
        sums.aG += g;
        sums.aB += b;
        aCount += 1;
      } else {
        sums.bR += r;
        sums.bG += g;
        sums.bB += b;
        bCount += 1;
      }
    }
    if (aCount === 0 || bCount === 0) break;
    aR = sums.aR / aCount;
    aG = sums.aG / aCount;
    aB = sums.aB / aCount;
    bR = sums.bR / bCount;
    bG = sums.bG / bCount;
    bB = sums.bB / bCount;
  }

  const total = reds.length;
  // Ties go to the darker cluster, which `a` is by seeding.
  const aWins = aCount * 2 >= total;
  return aWins
    ? { r: Math.round(aR), g: Math.round(aG), b: Math.round(aB) }
    : { r: Math.round(bR), g: Math.round(bG), b: Math.round(bB) };
}
