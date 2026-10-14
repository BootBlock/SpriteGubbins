import type { Rgba } from '../types/quantiser.ts';
import { refineToPalette, type ColorTally } from './exactSplit.ts';
import { partition } from './wuBoxSearch.ts';
import { buildMoments, WU_SIDE, wuCell, wuCellOfKey, type WuBox } from './wuMoments.ts';

/**
 * The Wu cut of a weighted histogram into `maxColors` groups, each contributing the colour that
 * weighs most in it: the palette `buildPalette` starts from before `lloydRefine` moves it.
 *
 * Both halves of the search are here — `wuBoxSearch` over the binned moment table, then
 * `exactSplit` at full precision where the table ran out of cuts. Why the search is shaped this
 * way, and what each half is for, is the module note in ./wuQuantiser.ts.
 *
 * `histogram` must hold more colours than `maxColors`; `buildPalette` answers the other case itself.
 */
export function wuPalette(histogram: ReadonlyMap<number, number>, maxColors: number): readonly Rgba[] {
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
