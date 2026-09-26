import { RGBA_CHANNELS } from '../types/quantiser.ts';
import type { Rgba } from '../types/quantiser.ts';

/**
 * The definition `nearestColorSearch` must agree with: every entry scored by squared distance across
 * all four channels, the earliest taking a tie.
 *
 * Test-only, because it is the specification the indexed search is held to and not a second way
 * for the app to answer. One copy, because the unit suite and the corpus suite hold the search to
 * the same thing.
 */
export function bruteForceNearest(color: Rgba, palette: readonly Rgba[]): Rgba | null {
  let chosen: Rgba | null = null;
  let shortest = Infinity;
  for (const candidate of palette) {
    let distance = 0;
    for (const channel of RGBA_CHANNELS) distance += (color[channel] - candidate[channel]) ** 2;
    if (distance < shortest) {
      shortest = distance;
      chosen = candidate;
    }
  }
  return chosen;
}
