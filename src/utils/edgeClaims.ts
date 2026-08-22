import type { AntiAliasMode } from '../types/quantiser.ts';
import { CHANNELS_PER_PIXEL, FULLY_TRANSPARENT, packedColorAt, unpackColor } from './imageData.ts';
import { walkEdgeRuns, type RunTurn } from './edgeRuns.ts';
import type { MutableOklab } from './oklab.ts';
import { srgbToOklabInto } from './oklab.ts';
import { pixelDistance } from './pixelDistance.ts';

/** Which neighbour a pixel's claim points at — the four orthogonal ones, or none. */
export const CLAIM_NONE = 0;
export const CLAIM_ABOVE = 1;
export const CLAIM_BELOW = 2;
export const CLAIM_LEFT = 3;
export const CLAIM_RIGHT = 4;

/**
 * How many steps to the unit {@link EdgeClaims.coverage} is stated in.
 *
 * A coverage is strictly below `0.5`, so 510 steps put the whole range in a byte with the top of it
 * exactly at 255 — the same fixed-point argument `DifferenceMap` makes, and for the same reason: one
 * entry per pixel of a sheet this app admits 16.8 million of, where four bytes for a float is another
 * fifty megabytes to allocate for a resolution twice as fine as the output byte it decides.
 */
export const CLAIM_PRECISION = 510;

/** The strongest claim on each pixel: how much of it belongs to a neighbour, and which neighbour. */
export interface EdgeClaims {
  /** Row-major, one per pixel, holding `coverage × CLAIM_PRECISION`; `0` is no claim. */
  readonly coverage: Uint8Array;
  /** Row-major, one per pixel, one of the `CLAIM_*` constants above. */
  readonly side: Uint8Array;
  /** How many pixels carry a claim, so a caller can skip a sheet the pass would not change. */
  readonly count: number;
}

/** What the sweep is allowed to claim, and how hard. */
export interface ClaimSettings {
  readonly mode: AntiAliasMode;
  /** How far apart two pixels must sit to be a contour, in the scaled OKLab `pixelDistance` uses. */
  readonly threshold: number;
  /** The share of each reconstructed coverage to keep, as a fraction in `(0, 1]`. */
  readonly strength: number;
  /** The shortest step run worth reconstructing, in drawn pixels. */
  readonly shortestRun: number;
}

/**
 * Every pixel's strongest claim on a neighbour, read off the sheet's own step patterns.
 *
 * The measuring half of the anti-aliasing pass: it decides *which* pixels are part of a contour that
 * is really a slope, and what fraction of each one belongs to the region across that contour.
 * `antiAlias` is the half that acts on the answer. Splitting them is what keeps the geometry —
 * discontinuities, runs, reconstructed coverage — testable without a palette, a blend or an output
 * image in the way.
 *
 * **Both axes, and a pixel takes the strongest claim rather than both.** A pixel at the corner of a
 * step is reached by a horizontal run and a vertical one, and applying two coverages in turn
 * compounds them into a colour neither contour asked for — at exactly the position where blending
 * twice is most visible. The larger claim is the one the reconstruction is more confident of.
 *
 * **The scope filter runs on the claim, not on the run.** A boundary between an opaque pixel and a
 * cleared one is a silhouette; any other is interior. Which of those a reader has asked for decides
 * whether the claim is kept — but never whether the run *exists*, because the reconstructed line is
 * a fact about the whole contour and a run traced over only half of it would be fitted to a shape
 * the sheet does not have.
 *
 * Pure. Two byte arrays per sheet rather than a float and an offset, one scratch colour per side of
 * each boundary, and a one-entry run cache on each — the shape `differenceMap` is written in, for
 * the same reason.
 */
export function edgeClaims(image: ImageData, settings: ClaimSettings): EdgeClaims {
  const { width, height, data } = image;
  const pixels = width * height;
  const coverage = new Uint8Array(pixels);
  const side = new Uint8Array(pixels);
  let count = 0;

  const lowLab: MutableOklab = { L: 0, a: 0, b: 0 };
  const highLab: MutableOklab = { L: 0, a: 0, b: 0 };
  let lowCached = -1;
  let highCached = -1;

  /**
   * Whether the two pixels at these offsets are far enough apart to be a contour.
   *
   * Identical pixels leave before any conversion, which is what keeps the sweep affordable: flat art
   * is most of a sprite sheet, and the packed comparison settles all of it in four byte reads a side.
   */
  const apart = (first: number, second: number): boolean => {
    const firstPacked = packedColorAt(data, first * CHANNELS_PER_PIXEL);
    const secondPacked = packedColorAt(data, second * CHANNELS_PER_PIXEL);
    if (firstPacked === secondPacked) return false;
    if (firstPacked !== lowCached) {
      const color = unpackColor(firstPacked);
      srgbToOklabInto(lowLab, color.r, color.g, color.b);
      lowCached = firstPacked;
    }
    if (secondPacked !== highCached) {
      const color = unpackColor(secondPacked);
      srgbToOklabInto(highLab, color.r, color.g, color.b);
      highCached = secondPacked;
    }
    // The packing puts alpha in the low byte — see `packColor`, which both forms of it agree on.
    return pixelDistance(lowLab, firstPacked % 256, highLab, secondPacked % 256) >= settings.threshold;
  };

  /** Whether this boundary is one the reader asked to soften. */
  const inScope = (low: number, high: number): boolean => {
    if (settings.mode === 'BOTH') return true;
    const lowClear = (data[low * CHANNELS_PER_PIXEL + 3] ?? 0) === FULLY_TRANSPARENT;
    const highClear = (data[high * CHANNELS_PER_PIXEL + 3] ?? 0) === FULLY_TRANSPARENT;
    const silhouette = lowClear !== highClear;
    return settings.mode === 'SILHOUETTE' ? silhouette : !silhouette;
  };

  /** Record a claim, keeping the stronger of it and whatever this pixel already carried. */
  const claim = (pixel: number, toward: number, area: number): void => {
    const scaled = Math.round(area * settings.strength * CLAIM_PRECISION);
    if (scaled <= 0 || scaled <= (coverage[pixel] ?? 0)) return;
    if ((coverage[pixel] ?? 0) === 0) count += 1;
    coverage[pixel] = scaled;
    side[pixel] = toward;
  };

  // The two sweeps are one shape read twice: `line` is the boundary's position across the sheet and
  // `index` runs along it, so the horizontal pass walks columns of a fixed row pair and the vertical
  // pass walks rows of a fixed column pair. `low` is the upper row or the left column.
  for (const vertical of [false, true]) {
    const lines = vertical ? width - 1 : height - 1;
    const span = vertical ? height : width;
    const offset = (line: number, index: number, high: boolean): number =>
      vertical ? index * width + line + (high ? 1 : 0) : (line + (high ? 1 : 0)) * width + index;

    for (let line = 0; line < lines; line += 1) {
      const separated = (index: number): boolean =>
        apart(offset(line, index, false), offset(line, index, true));
      const turnAt = (index: number): RunTurn => {
        if (index <= 0 || index >= span) return 'NONE';
        const low = apart(offset(line, index - 1, false), offset(line, index, false));
        const high = apart(offset(line, index - 1, true), offset(line, index, true));
        if (low === high) return 'NONE';
        return low ? 'LOW' : 'HIGH';
      };

      walkEdgeRuns(span, settings.shortestRun, separated, turnAt, (index, area) => {
        const low = offset(line, index, false);
        const high = offset(line, index, true);
        if (!inScope(low, high)) return;
        if (area > 0) claim(low, vertical ? CLAIM_RIGHT : CLAIM_BELOW, area);
        else claim(high, vertical ? CLAIM_LEFT : CLAIM_ABOVE, -area);
      });
    }
  }

  return { coverage, side, count };
}
