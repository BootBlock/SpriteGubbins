import type { Rgba } from '../types/quantiser.ts';
import { blendWeightedHistogram } from './blendHistogram.ts';
import { refineToPalette, type ColorTally } from './exactSplit.ts';
import { unpackColor } from './imageData.ts';
import { partition } from './wuBoxSearch.ts';
import { buildMoments, WU_SIDE, wuCell, wuCellOfKey, type WuBox } from './wuMoments.ts';

/**
 * Choosing the colours an image reduces to: Wu's variance-minimising quantiser over a binned moment
 * table, refined at full colour precision wherever that table could not separate what it held.
 *
 * **Why this and not median cut**, which it replaced: median cut splits the box with the widest
 * channel *range*, at the median pixel. Range is a poor proxy for how much a box costs — one
 * outlying colour stretches it without describing where the pixels actually are — so a sheet's
 * crowded, populous regions got too few slots and its sparse fringes too many. Wu instead scores
 * every candidate cut on every axis by the variance it *removes*, and takes the best one, which is
 * the quantity a palette is trying to minimise in the first place.
 *
 * Wu, *Efficient Statistical Computations for Optimal Color Quantization*, Graphics Gems II (1991).
 *
 * **Measured on the reference armour sheet** — 1254 × 1254, 218,978 colours — as mean OKLab
 * distance from each pixel to the entry it is drawn with, each colour weighted by how many pixels
 * carry it: **4.697** at a budget of 16, **3.287** at 32, **2.447** at 64, which is the app's
 * default, and **1.676** at 256, where a palette that large has room to be nearly right everywhere.
 * `tests/quantiser-docblock-figures.test.ts` re-derives all four, because the ladder these replace
 * was read off this search before `blendWeightedHistogram` was put in front of it and every one of
 * its numbers moved without anything failing.
 *
 * **It is a reading, not a score to minimise**, and the weighting is why. A per-pixel metric prices
 * a fringe colour at the pixels that carry it, which is the accounting `blendWeightedHistogram`
 * exists to overrule. Measured against the same search reading an unweighted histogram, the
 * weighting comes out ahead at 16, 32 and 64 and behind at 256, where it is spending slots on the
 * art that a per-pixel error would sooner have spent on blends. That comparison is a reading rather
 * than a consequence, and the suite does not hold it — an unweighted search is not something this
 * file does. What holds it in practice is the four rungs above: retuning the weight moves them, and
 * the failing test lands whoever did it on this paragraph.
 *
 * **A figure here is one this code can still produce**, which is what the retired ladder was not. It
 * had stood since Wu replaced median cut and was quoted against it, and the same commit deleted
 * `medianCut.ts` — so the before column cannot be recovered from any version of this file, and no
 * percentage is stated in its place. The comparison survives in words instead, which is where it can
 * be honest about being a recollection: **Why this and not median cut** at the top of this docblock,
 * and the shape of the cost below.
 *
 * It is also **roughly an order of magnitude faster on that sheet at every budget**, and the shape of
 * the cost is the part worth holding: the coarse pass's work is the moment table's, so it barely
 * moves as the palette grows, where median cut's climbed steeply with it — each of its splits
 * re-sorted a box. The refinement is the exception and is bounded by what it is given: a sheet whose
 * colours crowd into fewer bins than the budget pays for exact splitting instead, which is slower
 * than the coarse pass and still far short of what median cut cost. Absolute timings are stated
 * nowhere here on purpose, because they move by several times between runs on one machine; the
 * error figures above are deterministic and reproduce exactly.
 *
 * **The search is in two halves, and the second one is not optional.** `wuBoxSearch` works over the
 * 32-bin-per-channel table, which is what makes it fast and what bounds what it can see: colours
 * within eight steps of one another share a cell and no cut at that resolution divides them. On a
 * full-gamut sheet that never shows — the coarse pass reaches the budget alone. On the artwork this
 * app is for it shows badly: a 200-step grey ramp occupies 26 bins, so a budget of 64 returned 26
 * colours and raising it to 128 changed nothing. `exactSplit` therefore refines the coarse pass's
 * groups at full precision, by the same criterion, until the budget is met. It also splits across
 * **all four channels** where the table holds only three, which is what keeps one RGB at several
 * opacities from collapsing onto whichever opacity carried the most pixels — a soft edge over its
 * own colour, written opaque by `applyPalette`, is the hard halo the two palette arms exist to
 * prevent.
 *
 * **Every entry is a colour the image already contained**, which is a departure from Wu as published
 * and is not negotiable here. The paper's boxes contribute their weighted *mean*, and a mean invents
 * a colour that was not in the image — exactly what `alignToGrid` refuses to do a step earlier, and
 * what the tab promises it will not do. Both halves of the search decide only the *grouping*; every
 * group then contributes the colour the most pixels in it actually carry.
 *
 * **Deterministic**, which is why neither this nor its predecessor is k-means: no seeding, no
 * iteration budget, no `Math.random`. Every tie resolves to the earliest candidate in an order fixed
 * by the image, so the same image always yields the same palette and the tests can assert an exact
 * one.
 *
 * **The histogram it reads is weighted, and the weighting is part of the answer.** A generated
 * sheet's anti-aliased fringes are a large population of colours that exist only where two regions
 * meet, and counted pixel for pixel with the art's own flat colours they claim slots the art needed:
 * on a fixture whose art uses 24 colours, a budget of 24 kept 21 of them and spent three slots on
 * blends. `blendWeightedHistogram` is what a pixel partway between the two beside it is worth
 * instead. It removes no colour — every one the image holds is still a candidate — so the short
 * circuit below and every ordering guarantee above are exactly as they were.
 *
 * Drawing the image in the chosen palette is `applyPalette` in ./applyPalette.ts — a different
 * algorithm over any palette, not only one this file produced.
 */

/**
 * The palette the image reduces to: `maxColors` colours, every one of them a colour the image
 * already contained, or every colour it holds where it holds fewer than that.
 */
export function buildPalette(image: ImageData, maxColors: number): readonly Rgba[] {
  const histogram = blendWeightedHistogram(image);
  // Already inside the budget: reducing further would discard colours nothing asked to lose, and
  // scan order is what `identityPalette` documents it is re-sorting away from. The weighting cannot
  // reach this branch — it changes what a colour is worth, never whether the image contains it.
  if (histogram.size <= maxColors) return [...histogram.keys()].map(unpackColor);

  const boxes = partition(buildMoments(histogram), maxColors);
  return refineToPalette(groupByBox(histogram, boxes), maxColors);
}

/**
 * Every colour filed under the box that owns its bin.
 *
 * The boxes are turned into a lookup over the bin table first, so each colour is filed in one
 * indexing rather than tested against every box — the difference between one pass over the colours
 * and a pass per palette entry. The boxes partition the bins exactly, so every colour lands in
 * exactly one group and no bin falls through to a default.
 */
function groupByBox(
  histogram: ReadonlyMap<number, number>,
  boxes: readonly WuBox[],
): readonly (readonly ColorTally[])[] {
  const owner = new Uint16Array(WU_SIDE * WU_SIDE * WU_SIDE);
  for (const [index, box] of boxes.entries()) {
    for (let r = box.r0 + 1; r <= box.r1; r += 1) {
      for (let g = box.g0 + 1; g <= box.g1; g += 1) {
        for (let b = box.b0 + 1; b <= box.b1; b += 1) {
          owner[wuCell(r, g, b)] = index;
        }
      }
    }
  }

  const groups: ColorTally[][] = boxes.map(() => []);
  for (const [key, count] of histogram) {
    // Iterated in the histogram's own scan order, so a group the refinement never touches holds its
    // colours in that order — see `representative`, which is where the order is finally read.
    groups[owner[wuCellOfKey(key)] ?? 0]?.push({ key, count });
  }
  return groups;
}
