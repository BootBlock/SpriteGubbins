import { RGBA_CHANNELS } from '../types/quantiser.ts';
import type { Rgba } from '../types/quantiser.ts';
import { unpackColor } from './imageData.ts';

/**
 * Splitting groups of colours by the variance a cut removes, over the **exact** colours rather than
 * over a binned histogram.
 *
 * This is the second half of the palette search, and it exists because the first half cannot see
 * inside a bin. `wuMoments` quantises each channel to 32 levels, so two colours within eight steps
 * of one another — a shading ramp, a soft edge, a limited palette's neighbouring entries — occupy
 * one cell and no cut at that resolution separates them. On the full-gamut sheets a model usually
 * returns that is invisible: the colours are spread and the coarse pass reaches the budget on its
 * own. On the artwork this app is actually *for* it is not. A 200-step grey ramp occupies 26 bins,
 * so a budget of 64 came back with 26 colours, and raising the budget to 128 changed nothing.
 *
 * So where the coarse pass runs out of cuts with budget to spare, the groups it produced are
 * refined here by the same criterion at full precision — and across **all four channels**, which is
 * the other thing the moment table cannot do. Alpha is a channel like the other three (see `Rgba`):
 * one RGB at several opacities is several colours, and a soft edge that shares its colour with the
 * body behind it must be able to keep a slot of its own, or `applyPalette` writes the body's entry
 * whole over it and the sprite's fade-out becomes a hard edge.
 *
 * The cost is paid only where it buys something. A group is sorted once per channel per split, and
 * only the group actually being split is touched — so a sheet whose coarse pass already reached the
 * budget never enters this file at all.
 */

/** One distinct colour and how many pixels carry it. */
export interface ColorTally {
  readonly key: number;
  readonly count: number;
}

/** A colour with its four channels decoded, so a split sweep does not re-unpack them per position. */
interface Sample extends ColorTally {
  readonly channels: readonly [number, number, number, number];
}

/** A group of colours that will contribute one palette entry, and the variance it still holds. */
interface Group {
  readonly samples: readonly Sample[];
  readonly variance: number;
}

function sampleOf(tally: ColorTally): Sample {
  const color = unpackColor(tally.key);
  return { ...tally, channels: [color.r, color.g, color.b, color.a] };
}

/**
 * Refine `groups` until there are `maxColors` of them, or until nothing left will separate.
 *
 * Takes the coarse pass's groups as its starting point rather than starting from one group, so the
 * structure the moment table found — which is the fast, variance-optimal part — is kept and only
 * the tail is paid for at full precision.
 *
 * Returns one colour per group: the one the most pixels in it carry, earliest in scan order winning
 * a tie. That is the same rule the coarse pass uses and the same promise the whole quantiser makes —
 * every entry is a colour the image already contained, never an average of several.
 */
export function refineToPalette(
  groups: readonly (readonly ColorTally[])[],
  maxColors: number,
): readonly Rgba[] {
  const working: Group[] = groups
    .filter((samples) => samples.length > 0)
    .map((samples) => {
      const decoded = samples.map(sampleOf);
      return { samples: decoded, variance: varianceOf(decoded) };
    });

  while (working.length < maxColors) {
    let chosen = -1;
    let worst = 0;
    for (const [index, group] of working.entries()) {
      // Strictly greater, so the earliest group wins a tie and the split order is fixed.
      if (group.samples.length > 1 && group.variance > worst) {
        worst = group.variance;
        chosen = index;
      }
    }
    // Every remaining group is a single colour, or holds none the cut can tell apart.
    if (chosen === -1) break;

    const group = working[chosen];
    if (group === undefined) break;
    const halves = splitGroup(group.samples);
    if (halves === null) {
      // Unsplittable despite holding several colours, which only a zero-variance group can be:
      // retire it rather than reconsidering it forever.
      working[chosen] = { samples: group.samples, variance: 0 };
      continue;
    }

    working[chosen] = { samples: halves[0], variance: varianceOf(halves[0]) };
    working.push({ samples: halves[1], variance: varianceOf(halves[1]) });
  }

  return working
    .map((group) => representative(group.samples))
    .filter((color): color is Rgba => color !== null);
}

/**
 * How much colour variance a group holds, summed across all four channels and weighted by pixels.
 *
 * The same quantity the coarse pass minimises, computed the same way — Σ n·v² less the square of
 * the weighted mean — so the two halves of the search agree about which group is worth splitting.
 */
function varianceOf(samples: readonly Sample[]): number {
  let pixels = 0;
  const sums = [0, 0, 0, 0];
  const squares = [0, 0, 0, 0];
  for (const sample of samples) {
    pixels += sample.count;
    for (const [axis] of RGBA_CHANNELS.entries()) {
      const value = sample.channels[axis] ?? 0;
      sums[axis] = (sums[axis] ?? 0) + value * sample.count;
      squares[axis] = (squares[axis] ?? 0) + value * value * sample.count;
    }
  }
  if (pixels <= 0) return 0;

  let total = 0;
  for (const [axis] of RGBA_CHANNELS.entries()) {
    const sum = sums[axis] ?? 0;
    total += (squares[axis] ?? 0) - (sum * sum) / pixels;
  }
  return total;
}

/**
 * Cut a group in two at the position that removes the most variance, across whichever of the four
 * channels does it best — or `null` where no cut separates anything.
 *
 * Sorted by the channel under test with the packed colour breaking ties, so two colours sharing a
 * channel value still order the same way on every run; `sort` alone promises only to leave them as
 * it found them.
 */
function splitGroup(samples: readonly Sample[]): readonly [readonly Sample[], readonly Sample[]] | null {
  let best: { axis: number; at: number; score: number } | null = null;

  for (const [axis] of RGBA_CHANNELS.entries()) {
    const sorted = [...samples].sort(
      (left, right) => (left.channels[axis] ?? 0) - (right.channels[axis] ?? 0) || left.key - right.key,
    );
    const found = bestPosition(sorted);
    // Strictly greater, and the channels are walked r, g, b, a — so an exact tie between two
    // channels always resolves to the earlier one.
    if (found !== null && (best === null || found.score > best.score)) {
      best = { axis, at: found.at, score: found.score };
    }
  }
  if (best === null) return null;

  const sorted = [...samples].sort(
    (left, right) =>
      (left.channels[best.axis] ?? 0) - (right.channels[best.axis] ?? 0) || left.key - right.key,
  );
  return [sorted.slice(0, best.at + 1), sorted.slice(best.at + 1)];
}

/**
 * The best place to cut a sorted group, as the index the lower half ends on.
 *
 * Scored by the sum of the two halves' squared means over their pixel counts — maximising that is
 * the same decision as minimising the variance the cut leaves behind, since the group's total is
 * fixed. A position that would leave either half without a colour is not a cut and is never scored.
 */
function bestPosition(sorted: readonly Sample[]): { at: number; score: number } | null {
  let pixels = 0;
  const totals = [0, 0, 0, 0];
  for (const sample of sorted) {
    pixels += sample.count;
    for (const [axis] of RGBA_CHANNELS.entries()) {
      totals[axis] = (totals[axis] ?? 0) + (sample.channels[axis] ?? 0) * sample.count;
    }
  }

  let lowPixels = 0;
  const lowSums = [0, 0, 0, 0];
  let at = -1;
  let score = 0;
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const sample = sorted[index];
    if (sample === undefined) continue;
    lowPixels += sample.count;
    for (const [axis] of RGBA_CHANNELS.entries()) {
      lowSums[axis] = (lowSums[axis] ?? 0) + (sample.channels[axis] ?? 0) * sample.count;
    }
    const highPixels = pixels - lowPixels;
    if (lowPixels <= 0 || highPixels <= 0) continue;

    let total = 0;
    for (const [axis] of RGBA_CHANNELS.entries()) {
      const low = lowSums[axis] ?? 0;
      const high = (totals[axis] ?? 0) - low;
      total += (low * low) / lowPixels + (high * high) / highPixels;
    }
    // Strictly greater, so the lowest qualifying position wins a tie.
    if (total > score) {
      score = total;
      at = index;
    }
  }

  return at === -1 ? null : { at, score };
}

/** The colour a group speaks for: the one the most pixels carry, earliest in scan order on a tie. */
function representative(samples: readonly Sample[]): Rgba | null {
  let chosen: Sample | null = null;
  for (const sample of samples) {
    if (chosen === null || sample.count > chosen.count) chosen = sample;
  }
  return chosen === null ? null : unpackColor(chosen.key);
}
