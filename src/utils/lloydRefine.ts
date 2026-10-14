import type { Rgba } from '../types/quantiser.ts';
import { packColor, unpackColor } from './imageData.ts';
import { srgbToOklabInto, type MutableOklab } from './oklab.ts';
import { nearestPointSearch, type Point4 } from './nearestPointSearch.ts';

/**
 * A palette moved toward the colours it speaks for by Lloyd's k-means rounds, with every entry
 * snapped back to a colour the image holds after each round.
 *
 * Each round files every colour of `histogram` under its nearest entry, takes each entry's cell's
 * weighted mean, and replaces the entry with the member colour nearest that mean. The mean is never
 * an entry: it is a colour the image may not contain, and `buildPalette` promises that it returns
 * only colours the image holds. The snap keeps the promise and costs little, because a cell's
 * members crowd around its mean.
 *
 * Measured in scaled OKLab with coverage as a fourth axis, the space and scale of `pixelDistance`,
 * because that is the error the docblocks' ladders report. `applyPalette` then draws each pixel with
 * its nearest entry by RGBA distance, an opaque pixel among the opaque entries alone, so the cells
 * drawn are not exactly the cells refined here; the ladders are measured on the drawn result, and
 * they are where that difference would show. A fully transparent colour has no place in the space,
 * and `blendWeightedHistogram` leaves every one out.
 *
 * **It keeps the best palette it measured**, by the weighted distance from every colour to its
 * entry, the earlier palette taking a tie. A snapped round does not always lower that error, because
 * the snap can move an entry past the point the mean would have left it, so the last round is not
 * always the best. It stops once a round moves no entry, or after `rounds` rounds. Every tie inside
 * a round goes to the earlier entry or the earlier colour in the histogram's order, so the same image
 * always gives the same palette.
 *
 * **The entries stay distinct and keep their order.** An entry is a member of its own cell, since no
 * other entry is nearer to it than itself, so every cell holds a colour and the cells never share
 * one. Entry `i` of the result is the refinement of entry `i` of `palette`, which every caller that
 * reads the order relies on.
 *
 * `palette` must hold only colours of `histogram`, which is what a Wu cut hands over.
 */
export function lloydRefine(
  histogram: ReadonlyMap<number, number>,
  palette: readonly Rgba[],
  rounds: number,
): readonly Rgba[] {
  const colors = pointsOf(histogram);
  const centres = Int32Array.from(palette, (entry) => {
    const index = colors.indexOf.get(packColor(entry));
    if (index === undefined) throw new Error('lloydRefine was handed an entry the histogram does not hold.');
    return index;
  });

  let best = centres.slice();
  let lowest = Infinity;
  for (let round = 0; ; round += 1) {
    const cells = assign(colors, centres);
    // Strictly lower, so the earlier palette keeps a tie and a round that only trades one error for
    // an equal one is not taken.
    if (cells.cost < lowest) {
      lowest = cells.cost;
      best = centres.slice();
    }
    if (round === rounds || !snap(colors, centres, cells)) break;
  }
  return Array.from(best, (index) => unpackColor(colors.keys[index] ?? 0));
}

/** The histogram's colours in its own order, with their weights and their places in the space. */
interface ColorPoints {
  readonly keys: Uint32Array;
  readonly weights: Float64Array;
  readonly points: readonly Point4[];
  readonly indexOf: ReadonlyMap<number, number>;
}

function pointsOf(histogram: ReadonlyMap<number, number>): ColorPoints {
  const keys = Uint32Array.from(histogram.keys());
  const weights = Float64Array.from(histogram.values());
  const scratch: MutableOklab = { L: 0, a: 0, b: 0 };
  const points = Array.from(keys, (key): Point4 => {
    const color = unpackColor(key);
    srgbToOklabInto(scratch, color.r, color.g, color.b);
    return [scratch.L, scratch.a, scratch.b, color.a];
  });
  return { keys, weights, points, indexOf: new Map(Array.from(keys, (key, index) => [key, index])) };
}

/** Which entry each colour is filed under, each cell's weight and weighted sums, and the error. */
interface Cells {
  readonly owner: Int32Array;
  /** Five values per entry: the cell's weight, then its weighted sum on each of the four axes. */
  readonly sums: Float64Array;
  /** The weighted distance from every colour to its entry, summed. */
  readonly cost: number;
}

/** Every colour filed under its nearest entry, with the sums a mean needs and the palette's error. */
function assign(colors: ColorPoints, centres: Int32Array): Cells {
  const { points, weights } = colors;
  const nearest = nearestPointSearch(Array.from(centres, (index) => points[index] ?? [0, 0, 0, 0]));
  const owner = new Int32Array(points.length);
  const sums = new Float64Array(centres.length * 5);
  let cost = 0;

  for (const [index, point] of points.entries()) {
    const cell = nearest(point[0], point[1], point[2], point[3]);
    owner[index] = cell;
    const entry = points[centres[cell] ?? 0] ?? point;
    const weight = weights[index] ?? 0;
    const at = cell * 5;
    sums[at] = (sums[at] ?? 0) + weight;
    let squared = 0;
    for (let axis = 0; axis < 4; axis += 1) {
      const value = point[axis as 0 | 1 | 2 | 3];
      sums[at + 1 + axis] = (sums[at + 1 + axis] ?? 0) + value * weight;
      const delta = value - entry[axis as 0 | 1 | 2 | 3];
      squared += delta * delta;
    }
    cost += Math.sqrt(squared) * weight;
  }
  return { owner, sums, cost };
}

/**
 * Every entry moved to the member of its cell nearest the cell's weighted mean. Answers whether any
 * entry moved.
 */
function snap(colors: ColorPoints, centres: Int32Array, cells: Cells): boolean {
  const { owner, sums } = cells;
  const shortest = new Float64Array(centres.length).fill(Infinity);
  const chosen = new Int32Array(centres.length).fill(-1);
  for (const [index, point] of colors.points.entries()) {
    const cell = owner[index] ?? 0;
    const at = cell * 5;
    const total = sums[at] ?? 0;
    let distance = 0;
    for (let axis = 0; axis < 4; axis += 1) {
      const delta = point[axis as 0 | 1 | 2 | 3] - (sums[at + 1 + axis] ?? 0) / total;
      distance += delta * delta;
    }
    // Strictly shorter, so the earliest colour in the histogram's order takes a tie.
    if (distance < (shortest[cell] ?? Infinity)) {
      shortest[cell] = distance;
      chosen[cell] = index;
    }
  }

  let moved = false;
  for (const [cell, member] of chosen.entries()) {
    if (member === -1 || member === centres[cell]) continue;
    centres[cell] = member;
    moved = true;
  }
  return moved;
}
