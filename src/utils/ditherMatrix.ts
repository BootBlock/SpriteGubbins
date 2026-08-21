import { BAYER_EDGES, BLUE_NOISE_LEVELS, BLUE_NOISE_TILE } from '../constants/quantiser.ts';
import type { DitherPattern, ThresholdMatrix } from '../types/quantiser.ts';
import { bayerMatrix } from './bayerMatrix.ts';
import { voidAndClusterRanks } from './voidAndCluster.ts';

/**
 * The threshold tile a dither pattern names, or `null` where the pattern is the off position.
 *
 * **Built once and held**, which is not an optimisation for the Bayer pair — those are a dozen
 * lines of arithmetic — but is the whole reason this function exists for the blue-noise tile:
 * void-and-cluster ranks four thousand positions by scanning the tile once per rank, and the
 * quantiser re-runs its pipeline on every keystroke of the grid box. Generated per transform it
 * would be the most expensive pass in the tab; generated once it is a startup cost paid by the
 * first reader who chooses it and by nobody else.
 *
 * The cache is module state in a *worker*, which is where the whole pipeline runs — see
 * `quantiseWorker.ts`. Nothing here depends on the sheet, so there is nothing for it to go stale
 * against.
 */
const MATRICES = new Map<DitherPattern, ThresholdMatrix>();

export function ditherMatrix(pattern: DitherPattern): ThresholdMatrix | null {
  if (pattern === 'NONE') return null;

  const held = MATRICES.get(pattern);
  if (held !== undefined) return held;

  const built = build(pattern);
  MATRICES.set(pattern, built);
  return built;
}

/**
 * The tile itself, before it is held.
 *
 * The blue-noise tile is **ranked over four thousand positions and then folded to
 * {@link BLUE_NOISE_LEVELS} ratios**, which is the one place the two halves of a threshold pattern
 * come apart. A tile's size decides how far apart two positions carrying the same ratio can be —
 * 64 is what keeps the pattern from repeating anywhere the eye can follow — while its *levels*
 * decide how finely a mixing plan can be stated, and a plan searched over four thousand ratios
 * would cost sixty-four times what it buys, since no palette pair has four thousand distinguishable
 * mixtures in it. Folding the ranks in blocks of sixty-four keeps the even spread and puts the
 * ladder on the same rung the 8 × 8 matrix already uses.
 */
function build(pattern: Exclude<DitherPattern, 'NONE'>): ThresholdMatrix {
  if (pattern === 'BLUE_NOISE') {
    const ranks = voidAndClusterRanks(BLUE_NOISE_TILE);
    const positions = BLUE_NOISE_TILE * BLUE_NOISE_TILE;
    const folded = new Uint16Array(positions);
    for (let at = 0; at < positions; at += 1) {
      folded[at] = Math.floor(((ranks[at] ?? 0) * BLUE_NOISE_LEVELS) / positions);
    }
    return { size: BLUE_NOISE_TILE, levels: BLUE_NOISE_LEVELS, ranks: folded };
  }

  return bayerMatrix(BAYER_EDGES[pattern]);
}
