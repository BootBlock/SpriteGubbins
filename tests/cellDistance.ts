import { CHANNELS_PER_PIXEL, pixelOffset } from '../src/utils/imageData.ts';
import { conesToOklabInto, srgbToConesInto } from '../src/utils/oklab.ts';
import type { MutableCones, MutableOklab } from '../src/utils/oklab.ts';
import { pixelDistanceOf } from '../src/utils/pixelDistance.ts';
import type { GridMesh } from '../src/types/quantiser.ts';

/**
 * The metric the two dither tables in `constants/quantiser.ts` are stated in: the mean scaled-OKLab
 * distance between two sheets, per pixel and over aligned blocks averaged in linear light.
 *
 * In `tests/` rather than `src/utils/`, because nothing in the app measures this — it is what a
 * *calibration* is read off, and the app's own difference readout is `differenceMap`, which answers
 * a different question (one figure per cell against the source patch, not two resolved sheets
 * against a common reference).
 *
 * **Cone responses rather than sRGB bytes**, because a block average is what the eye does with a
 * dither and light adds linearly — the same reason `mixingPlan` interpolates there. Averaging the
 * bytes first would charge every pattern for a difference the pattern does not have.
 */

/** One field of cone responses plus alpha, four numbers per pixel, in reading order. */
export type ConeField = Float64Array;

/** Every pixel of `image` as cone responses plus its own alpha. */
export function toConeField(image: ImageData): ConeField {
  const out = new Float64Array(image.width * image.height * 4);
  const cones: MutableCones = { long: 0, medium: 0, short: 0 };
  for (let at = 0, to = 0; at < image.data.length; at += CHANNELS_PER_PIXEL, to += 4) {
    srgbToConesInto(cones, image.data[at] ?? 0, image.data[at + 1] ?? 0, image.data[at + 2] ?? 0);
    out[to] = cones.long;
    out[to + 1] = cones.medium;
    out[to + 2] = cones.short;
    out[to + 3] = image.data[at + 3] ?? 0;
  }
  return out;
}

/**
 * The source's own mesh-cell means, as a field the size of the result — the reference the
 * `DITHER_CHOICES` table is measured against, which belongs to no configuration in it.
 */
export function cellMeanField(source: ImageData, mesh: GridMesh): ConeField {
  const width = mesh.x.length;
  const out = new Float64Array(width * mesh.y.length * 4);
  const cones: MutableCones = { long: 0, medium: 0, short: 0 };
  for (const [row, top] of mesh.y.entries()) {
    const bottom = Math.min(mesh.y[row + 1] ?? source.height, source.height);
    for (const [column, left] of mesh.x.entries()) {
      const right = Math.min(mesh.x[column + 1] ?? source.width, source.width);
      let long = 0;
      let medium = 0;
      let short = 0;
      let alpha = 0;
      let counted = 0;
      for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) {
          const at = pixelOffset(source.width, x, y);
          srgbToConesInto(cones, source.data[at] ?? 0, source.data[at + 1] ?? 0, source.data[at + 2] ?? 0);
          long += cones.long;
          medium += cones.medium;
          short += cones.short;
          alpha += source.data[at + 3] ?? 0;
          counted += 1;
        }
      }
      const to = (row * width + column) * 4;
      const divisor = Math.max(counted, 1);
      out[to] = long / divisor;
      out[to + 1] = medium / divisor;
      out[to + 2] = short / divisor;
      out[to + 3] = alpha / divisor;
    }
  }
  return out;
}

/**
 * The mean distance between two fields over aligned blocks of `block` pixels a side — `1` being the
 * per-pixel figure. A block the sheet's own edge cuts short is averaged over whatever it holds.
 */
export function meanCellDistance(
  left: ConeField,
  right: ConeField,
  width: number,
  height: number,
  block: number,
): number {
  const a: MutableOklab = { L: 0, a: 0, b: 0 };
  const b: MutableOklab = { L: 0, a: 0, b: 0 };
  let total = 0;
  let blocks = 0;
  for (let top = 0; top < height; top += block) {
    for (let start = 0; start < width; start += block) {
      let aLong = 0;
      let aMedium = 0;
      let aShort = 0;
      let aAlpha = 0;
      let bLong = 0;
      let bMedium = 0;
      let bShort = 0;
      let bAlpha = 0;
      let counted = 0;
      for (let y = top; y < Math.min(top + block, height); y += 1) {
        for (let x = start; x < Math.min(start + block, width); x += 1) {
          const at = (y * width + x) * 4;
          aLong += left[at] ?? 0;
          aMedium += left[at + 1] ?? 0;
          aShort += left[at + 2] ?? 0;
          aAlpha += left[at + 3] ?? 0;
          bLong += right[at] ?? 0;
          bMedium += right[at + 1] ?? 0;
          bShort += right[at + 2] ?? 0;
          bAlpha += right[at + 3] ?? 0;
          counted += 1;
        }
      }
      if (counted === 0) continue;
      conesToOklabInto(a, aLong / counted, aMedium / counted, aShort / counted);
      conesToOklabInto(b, bLong / counted, bMedium / counted, bShort / counted);
      total += pixelDistanceOf(a.L, a.a, a.b, aAlpha / counted, b.L, b.a, b.b, bAlpha / counted);
      blocks += 1;
    }
  }
  return blocks === 0 ? 0 : total / blocks;
}
