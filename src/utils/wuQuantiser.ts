import type { Rgba } from '../types/quantiser.ts';
import { refineToPalette, type ColorTally } from './exactSplit.ts';
import { colorHistogram, unpackColor } from './imageData.ts';
import { partition } from './wuBoxSearch.ts';
import { buildMoments, WU_SIDE, wuBin, wuCell, type WuBox } from './wuMoments.ts';

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
 * **Measured on the reference armour sheet** — 1254 × 1254, 218,978 colours — against the median cut
 * it replaced, as mean OKLab distance from each pixel to the entry it is drawn with: at a budget of
 * 64, the app's default, the error falls from 3.59 to 2.47, a **31%** improvement; at 32 it is 36%
 * and at 16 it is 50%, and the gap narrows to 15% by 256, where a palette that large has room for
 * both algorithms to be nearly right. Those figures are deterministic and reproduce exactly.
 *
 * It is also **roughly an order of magnitude faster at every budget**, and the shape of the cost is
 * the part worth holding: this search's work is the moment table's, so it barely moves as the
 * palette grows, where median cut's climbed steeply with it — each of its splits re-sorted a box.
 * Absolute timings are stated nowhere here on purpose, because they move by several times between
 * runs on one machine; the ratio and the flatness are what reproduce.
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
 * iteration budget, no `Math.random`. Every tie resolves to the earliest candidate in scan order, so
 * the same image always yields the same palette and the tests can assert an exact one.
 *
 * Drawing the image in the chosen palette is `applyPalette` in ./applyPalette.ts — a different
 * algorithm over any palette, not only one this file produced.
 */

/**
 * The palette the image reduces to: `maxColors` colours, every one of them a colour the image
 * already contained, or every colour it holds where it holds fewer than that.
 */
export function buildPalette(image: ImageData, maxColors: number): readonly Rgba[] {
  const histogram = colorHistogram(image);
  // Already inside the budget: reducing further would discard colours nothing asked to lose, and
  // scan order is what `identityPalette` documents it is re-sorting away from.
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
    const r = Math.floor(key / 16777216) % 256;
    const g = Math.floor(key / 65536) % 256;
    const b = Math.floor(key / 256) % 256;
    // Iterated in the histogram's own scan order, so each group's colours stay in scan order too —
    // which is what the representative's tie-break ultimately rests on.
    groups[owner[wuCell(wuBin(r), wuBin(g), wuBin(b))] ?? 0]?.push({ key, count });
  }
  return groups;
}
