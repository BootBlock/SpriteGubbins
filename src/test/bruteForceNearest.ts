import { RGBA_CHANNELS } from '../types/quantiser.ts';
import type { Rgba } from '../types/quantiser.ts';

/**
 * The definition `nearestColorSearch` must agree with: every entry scored by squared distance across
 * all four channels, the earliest taking a tie — and an opaque colour scoring only the opaque
 * entries, wherever the palette holds one.
 *
 * Test-only, because it is the specification the indexed search is held to and not a second way
 * for the app to answer. One copy, because the unit suite and the corpus suite hold the search to
 * the same thing.
 */
export function bruteForceNearest(color: Rgba, palette: readonly Rgba[]): Rgba | null {
  const opaqueOnly = color.a === 255 && palette.some((entry) => entry.a === 255);
  let chosen: Rgba | null = null;
  let shortest = Infinity;
  for (const candidate of palette) {
    if (opaqueOnly && candidate.a !== 255) continue;
    let distance = 0;
    for (const channel of RGBA_CHANNELS) distance += (color[channel] - candidate[channel]) ** 2;
    if (distance < shortest) {
      shortest = distance;
      chosen = candidate;
    }
  }
  return chosen;
}
