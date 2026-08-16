import { measurableGridCeiling, MIN_ESTIMATED_GRID } from '../constants/quantiser.ts';
import type { PixelGrid } from '../types/quantiser.ts';
import { boundaryClusters } from './boundaryClusters.ts';
import { stepProfile } from './stepProfile.ts';

/**
 * The scale of art whose blocks repeat at *almost* a period — the sheets generators actually
 * return, and the ones both integer readings refuse.
 *
 * `detectPixelGrid` needs every transition on one lattice and `estimatePixelGrid` needs nine
 * tenths of the change within a pixel of one, and drifting art satisfies neither: its boundary
 * spacings wander between, say, 6 and 7, so no integer lattice at any phase collects them. What
 * the drift does not destroy is the *typical spacing* — measure where the boundaries actually
 * sit and the gaps between neighbours cluster tightly around the scale the art was drawn at. The
 * median of those gaps is that scale, read the way `boundaryMesh` will consume it.
 *
 * **Offered only where the spacings genuinely cluster.** A median exists for any two lines, so
 * the reading demands enough spacings to call a habit — and demands that most of them sit within
 * a pixel of the median, which is the drift a mesh can follow. Wider scatter than that is not a
 * drifting grid, it is an image with edges at assorted distances, and offering its median as a
 * scale would hand the user a confident number that means nothing.
 */

/** The fewest boundary spacings that can call the spacing a habit rather than a coincidence. */
const FEWEST_SPACINGS = 6;

/** The share of spacings that must sit within a pixel of the median for it to be offered. */
const SPACING_AGREEMENT = 0.7;

/** The scale a drifting sheet's boundary spacings imply, or `null` where they imply none. */
export function estimateMeshPeriod(image: ImageData): PixelGrid | null {
  const profile = stepProfile(image);
  const spacings = [
    ...axisSpacings(boundaryClusters(profile.columns).map((line) => line.position)),
    ...axisSpacings(boundaryClusters(profile.rows).map((line) => line.position)),
  ];
  if (spacings.length < FEWEST_SPACINGS) return null;

  const sorted = [...spacings].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const period = Math.round(median);
  if (period < MIN_ESTIMATED_GRID || period > measurableGridCeiling(image.width, image.height)) return null;

  const agreeing = spacings.filter((spacing) => Math.abs(spacing - median) <= 1).length;
  return agreeing / spacings.length >= SPACING_AGREEMENT ? period : null;
}

/** The gaps between neighbouring lines on one axis. */
function axisSpacings(positions: readonly number[]): number[] {
  const spacings: number[] = [];
  for (let index = 1; index < positions.length; index += 1) {
    spacings.push((positions[index] ?? 0) - (positions[index - 1] ?? 0));
  }
  return spacings;
}
