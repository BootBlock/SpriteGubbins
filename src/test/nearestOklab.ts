import type { Rgba } from '../types/quantiser.ts';
import { type Oklab, srgbToOklab } from '../utils/oklab.ts';

/**
 * The definition the app's OKLab nearest-colour searches must agree with: every entry scored by
 * squared distance in scaled OKLab, colour only, the earliest taking a tie.
 *
 * Test-only, because it is the specification `lockedEntryFor` and `blendSnap` are held to and not a
 * second way for the app to answer, as `bruteForceNearest` is for `nearestColorSearch`. The figure
 * suites also read a colour's reach to a lock off it.
 */

/** One entry and where it sits in scaled OKLab — the form {@link nearestOklab} searches. */
export interface LocatedEntry {
  readonly entry: Rgba;
  readonly lab: Oklab;
}

/** The entries converted once, rather than once per colour looked up, for {@link nearestOklab}. */
export function locateEntries(entries: readonly Rgba[]): readonly LocatedEntry[] {
  return entries.map((entry) => ({ entry, lab: srgbToOklab(entry.r, entry.g, entry.b) }));
}

/**
 * The entry closest to a colour in scaled OKLab, with the squared distance it won at, or `null` for
 * an empty list. Squared, because a caller compares it with a squared threshold.
 */
export function nearestOklab(
  source: Rgba,
  located: readonly LocatedEntry[],
): { entry: Rgba; distance: number } | null {
  const color = srgbToOklab(source.r, source.g, source.b);
  let chosen: Rgba | null = null;
  let shortest = Infinity;

  for (const { entry, lab } of located) {
    const dL = color.L - lab.L;
    const dA = color.a - lab.a;
    const dB = color.b - lab.b;
    const distance = dL * dL + dA * dA + dB * dB;
    if (distance < shortest) {
      shortest = distance;
      chosen = entry;
    }
  }

  return chosen === null ? null : { entry: chosen, distance: shortest };
}
