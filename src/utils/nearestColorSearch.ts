import { RGBA_CHANNELS } from '../types/quantiser.ts';
import type { Rgba, RgbaChannel } from '../types/quantiser.ts';

/**
 * A search for the palette entry closest to a colour: squared distance across all four channels,
 * the earliest entry taking a tie.
 *
 * Built once per palette and asked once per distinct colour, because "which palette entry does this
 * colour belong to" is asked three times — by `applyPalette` and `applyRgbPalette`, to redraw a
 * pixel, and by `identityPalette`, to total how much of the image each entry speaks for. Three
 * distance loops would be three answers to one question, and the tie-break is the half that would
 * quietly diverge.
 *
 * **Why an index rather than a loop over the list.** The loop this replaces read every entry
 * through string-keyed properties, once per distinct colour, and on `armour.png` it was most of the
 * palette step's cost: 962 ms at a budget of 64 and 3,451 ms at 256, against 500 ms and 681 ms for
 * `buildPalette` choosing the palette in the first place. This search redraws the same sheet in
 * 130–180 ms at either budget, with the same output. The entries are sorted on the channel they
 * spread widest across and held in flat typed arrays, and the search walks outwards from the
 * colour's own position on that channel. The gap on that one channel is a floor under the whole
 * distance, so each direction stops at the first entry whose gap alone is further than the best
 * found, and a candidate is abandoned as soon as its partial distance passes the best.
 *
 * **The answer is the brute force's, exactly, and the tie-break is what that costs.** A direction
 * stops only when its gap is *strictly* further than the best, because an entry exactly as far away
 * still wins if it came earlier in the palette — the order is the caller's, and a pinned palette's
 * order decides the sheet. `tests/nearest-color-search-corpus.test.ts` holds it to the brute force
 * over every colour of the reference sheet.
 */
export function nearestColorSearch(palette: readonly Rgba[]): (color: Rgba) => Rgba | null {
  const axis = widestChannel(palette);
  const [first, second, third] = OTHER_CHANNELS[axis];
  const sorted = palette
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => left.entry[axis] - right.entry[axis] || left.index - right.index);

  const axisValues = Int32Array.from(sorted, ({ entry }) => entry[axis]);
  const firstValues = Int32Array.from(sorted, ({ entry }) => entry[first]);
  const secondValues = Int32Array.from(sorted, ({ entry }) => entry[second]);
  const thirdValues = Int32Array.from(sorted, ({ entry }) => entry[third]);
  const indices = Int32Array.from(sorted, ({ index }) => index);
  const count = sorted.length;

  return (color) => {
    const target = color[axis];
    const firstTarget = color[first];
    const secondTarget = color[second];
    const thirdTarget = color[third];

    let bestIndex = -1;
    let shortest = Infinity;

    /** Scores one sorted position; `false` once its axis gap alone rules it and every entry beyond it out. */
    const visit = (position: number): boolean => {
      const gap = (axisValues[position] ?? 0) - target;
      let distance = gap * gap;
      if (distance > shortest) return false;
      let delta = (firstValues[position] ?? 0) - firstTarget;
      distance += delta * delta;
      if (distance > shortest) return true;
      delta = (secondValues[position] ?? 0) - secondTarget;
      distance += delta * delta;
      if (distance > shortest) return true;
      delta = (thirdValues[position] ?? 0) - thirdTarget;
      distance += delta * delta;
      const index = indices[position] ?? 0;
      if (distance < shortest || (distance === shortest && index < bestIndex)) {
        shortest = distance;
        bestIndex = index;
      }
      return true;
    };

    let above = lowerBound(axisValues, target);
    let below = above - 1;
    while (above < count || below >= 0) {
      // The nearer side first, so the best found tightens as fast as it can.
      const takeAbove =
        below < 0 ||
        (above < count && (axisValues[above] ?? 0) - target <= target - (axisValues[below] ?? 0));
      if (takeAbove) {
        above = visit(above) ? above + 1 : count;
      } else {
        below = visit(below) ? below - 1 : -1;
      }
    }

    // `palette[-1]` is undefined, so an empty palette answers null here too.
    return palette[bestIndex] ?? null;
  };
}

/** The three channels besides each one, in `RGBA_CHANNELS` order. */
const OTHER_CHANNELS: Readonly<Record<RgbaChannel, readonly [RgbaChannel, RgbaChannel, RgbaChannel]>> = {
  r: ['g', 'b', 'a'],
  g: ['r', 'b', 'a'],
  b: ['r', 'g', 'a'],
  a: ['r', 'g', 'b'],
};

/**
 * The channel the palette's entries differ across most, by variance, the earlier channel taking a
 * tie.
 *
 * The search is only as fast as that one channel separates the entries: sorted on a channel they
 * all share, which alpha is for a machine's palette, every gap is zero and the search visits
 * everything. The choice changes how many entries are visited, never which one wins.
 */
function widestChannel(palette: readonly Rgba[]): RgbaChannel {
  let widest: RgbaChannel = RGBA_CHANNELS[0];
  let widestSpread = -1;
  for (const channel of RGBA_CHANNELS) {
    let sum = 0;
    let sumOfSquares = 0;
    for (const entry of palette) {
      sum += entry[channel];
      sumOfSquares += entry[channel] * entry[channel];
    }
    // Scaled by the count squared rather than divided, which keeps the arithmetic in integers.
    const spread = palette.length * sumOfSquares - sum * sum;
    if (spread > widestSpread) {
      widestSpread = spread;
      widest = channel;
    }
  }
  return widest;
}

/** The first position whose value is at least `target`, or the length when none is. */
function lowerBound(values: Int32Array, target: number): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if ((values[middle] ?? 0) < target) low = middle + 1;
    else high = middle;
  }
  return low;
}
