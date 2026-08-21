import type { ThresholdMatrix } from '../types/quantiser.ts';

/**
 * The recursive ordered-dither matrix of a given edge — Bayer's, built rather than written down.
 *
 * The construction is the one the pattern is *defined* by: a 1 × 1 matrix holding 0, and each
 * doubling laying four scaled copies of it side by side, `4M + q` with `q` taken from
 * {@link QUADRANTS} by which quarter of the new matrix a position falls in. So a 4 × 4 matrix holds
 * every rank from 0 to 15 exactly once and an 8 × 8 every rank from 0 to 63, which is what makes a
 * ladder of `size²` levels distribute a ratio evenly across the tile.
 *
 * **The copies are tiled, not expanded in place, and the difference is the whole pattern.** Writing
 * each entry as a 2 × 2 block of `4v + q` produces a matrix holding the same ranks — and puts
 * consecutive ranks next to each other, which is a *clustered* dot pattern rather than a dispersed
 * one. Tiled, rank 0 and rank 1 land in opposite quadrants, as far apart as the tile allows, which
 * is what lets a ratio of one in sixteen put its lone pixel in the middle of each cell and read as
 * an even texture instead of as clumps.
 *
 * Built rather than transcribed because a transcribed matrix is sixteen or sixty-four numbers with
 * no way to check one of them by eye — a single transposed pair is a visible artefact in the sheet
 * and an invisible one in the diff. The recursion is six lines and states the rule instead.
 *
 * `size` must be a power of two — every doubling is one recursion step, and there is no half step to
 * take. The two the tab offers, 4 and 8, are the two the literature names.
 */
export function bayerMatrix(size: number): ThresholdMatrix {
  let edge = 1;
  let ranks = Uint16Array.from([0]);

  while (edge < size) {
    const wide = edge * 2;
    const next = new Uint16Array(wide * wide);
    for (let y = 0; y < wide; y += 1) {
      for (let x = 0; x < wide; x += 1) {
        const quadrant = QUADRANTS[(y < edge ? 0 : 2) + (x < edge ? 0 : 1)] ?? 0;
        next[y * wide + x] = 4 * (ranks[(y % edge) * edge + (x % edge)] ?? 0) + quadrant;
      }
    }
    edge = wide;
    ranks = next;
  }

  return { size: edge, levels: edge * edge, ranks };
}

/**
 * What each quarter of a doubled matrix adds to the copy it holds, row-major: 0 and 2 across the
 * top, 3 and 1 across the bottom.
 *
 * The offsets are what make the four copies interleave rather than repeat: diagonally opposite
 * quadrants differ by 1, so rank 0 and rank 1 land in opposite corners of the tile, as far apart as
 * the wrap allows. That is a claim about the *first* pair only — deeper in the ladder consecutive
 * ranks fall inside a shared quadrant and come closer, and 7 and 8 in the 4 × 4 matrix are
 * neighbours. What holds across the whole ladder is the average, which `bayerMatrix.test.ts` pins
 * against the per-entry expansion that would fail it.
 */
const QUADRANTS = [0, 2, 3, 1] as const;
