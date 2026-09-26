import { COVERAGE_FLOOR, K_CENTROID_PASSES } from '../constants/quantiser.ts';
import type { GridMesh, Rgba } from '../types/quantiser.ts';
import { createImage, pixelOffset } from './imageData.ts';

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
 * rather than its input.
 *
 * **Every pixel at or above {@link COVERAGE_FLOOR} takes part, in proportion to its coverage** —
 * the policy that constant states, and the one `inkWeightedCells` keeps. A pixel under the floor is
 * absent, as the keyed field is, and a cell whose present pixels are fewer than half of it resolves
 * to transparency; art at a soft alpha is still art. A present pixel weighs its alpha in the
 * centres' means and in the count that decides which cluster dominates, so a cluster of nearly
 * invisible pixels cannot outvote the opaque surface beside it, and the cell is written at its
 * winning cluster's own coverage, each member's alpha weighted by itself.
 */
export function kCentroidCells(image: ImageData, mesh: GridMesh): ImageData {
  const output = createImage(mesh.x.length, mesh.y.length);
  const reds: number[] = [];
  const greens: number[] = [];
  const blues: number[] = [];
  const alphas: number[] = [];

  for (const [cellY, top] of mesh.y.entries()) {
    const bottom = Math.min(mesh.y[cellY + 1] ?? image.height, image.height);
    for (const [cellX, left] of mesh.x.entries()) {
      const right = Math.min(mesh.x[cellX + 1] ?? image.width, image.width);

      reds.length = 0;
      greens.length = 0;
      blues.length = 0;
      alphas.length = 0;
      let darkest = 0;
      let brightest = 0;
      let darkestLuma = 256;
      let brightestLuma = -1;
      let darkestPacked = Infinity;
      let brightestPacked = -1;
      for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) {
          const offset = pixelOffset(image.width, x, y);
          const alpha = image.data[offset + 3] ?? 0;
          if (alpha < COVERAGE_FLOOR) continue;
          const r = image.data[offset] ?? 0;
          const g = image.data[offset + 1] ?? 0;
          const b = image.data[offset + 2] ?? 0;
          const index = reds.length;
          reds.push(r);
          greens.push(g);
          blues.push(b);
          alphas.push(alpha);
          const luma = (54 * r + 183 * g + 19 * b) >> 8;
          // Ties on luma break by packed value, so two different colours that happen to read
          // equally light still seed two clusters — without this a 50/50 red-and-blue cell
          // collapsed both seeds onto its first pixel and answered a raw colour, not a centre.
          const packed = (r * 256 + g) * 256 + b;
          if (luma < darkestLuma || (luma === darkestLuma && packed < darkestPacked)) {
            darkestLuma = luma;
            darkestPacked = packed;
            darkest = index;
          }
          if (luma > brightestLuma || (luma === brightestLuma && packed > brightestPacked)) {
            brightestLuma = luma;
            brightestPacked = packed;
            brightest = index;
          }
        }
      }

      const out = pixelOffset(mesh.x.length, cellX, cellY);
      const area = (right - left) * (bottom - top);
      if (reds.length * 2 < area) continue;

      const centre = dominantCentroid({ reds, greens, blues, alphas }, darkest, brightest);
      output.data[out] = centre.r;
      output.data[out + 1] = centre.g;
      output.data[out + 2] = centre.b;
      output.data[out + 3] = centre.a;
    }
  }

  return output;
}

/** A cell's present pixels, one channel to a list, in scan order. */
interface CellPixels {
  readonly reds: readonly number[];
  readonly greens: readonly number[];
  readonly blues: readonly number[];
  readonly alphas: readonly number[];
}

/**
 * The settled dominant cluster's centre, from seeds at the cell's luma extremes: its colour the
 * members' coverage-weighted mean, and its alpha each member's alpha weighted by itself.
 */
function dominantCentroid(pixels: CellPixels, darkest: number, brightest: number): Rgba {
  const { reds, greens, blues, alphas } = pixels;
  let aR = reds[darkest] ?? 0;
  let aG = greens[darkest] ?? 0;
  let aB = blues[darkest] ?? 0;
  let bR = reds[brightest] ?? 0;
  let bG = greens[brightest] ?? 0;
  let bB = blues[brightest] ?? 0;

  let sums = emptySums();
  for (let pass = 0; pass < K_CENTROID_PASSES; pass += 1) {
    sums = emptySums();
    for (const [index, r] of reds.entries()) {
      const g = greens[index] ?? 0;
      const b = blues[index] ?? 0;
      const alpha = alphas[index] ?? 0;
      const toA = (r - aR) ** 2 + (g - aG) ** 2 + (b - aB) ** 2;
      const toB = (r - bR) ** 2 + (g - bG) ** 2 + (b - bB) ** 2;
      // `<=` sends an equidistant pixel to the darker seed's cluster — the deterministic tie, in
      // the direction the app's whole line policy leans.
      const cluster = toA <= toB ? sums.a : sums.b;
      cluster.r += r * alpha;
      cluster.g += g * alpha;
      cluster.b += b * alpha;
      cluster.coverage += alpha;
      cluster.opacity += alpha * alpha;
    }
    if (sums.a.coverage === 0 || sums.b.coverage === 0) break;
    aR = sums.a.r / sums.a.coverage;
    aG = sums.a.g / sums.a.coverage;
    aB = sums.a.b / sums.a.coverage;
    bR = sums.b.r / sums.b.coverage;
    bG = sums.b.g / sums.b.coverage;
    bB = sums.b.b / sums.b.coverage;
  }

  // Ties go to the darker cluster, which `a` is by seeding.
  const aWins = sums.a.coverage >= sums.b.coverage;
  const winner = aWins ? sums.a : sums.b;
  return {
    r: Math.round(aWins ? aR : bR),
    g: Math.round(aWins ? aG : bG),
    b: Math.round(aWins ? aB : bB),
    a: Math.round(winner.opacity / winner.coverage),
  };
}

/** One cluster's premultiplied sums: each channel times the coverage, the coverage, and its square. */
interface ClusterSums {
  r: number;
  g: number;
  b: number;
  coverage: number;
  opacity: number;
}

function emptySums(): { a: ClusterSums; b: ClusterSums } {
  return {
    a: { r: 0, g: 0, b: 0, coverage: 0, opacity: 0 },
    b: { r: 0, g: 0, b: 0, coverage: 0, opacity: 0 },
  };
}
