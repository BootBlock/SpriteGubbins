import { BLUE_NOISE_SEED, BLUE_NOISE_SIGMA, BLUE_NOISE_MINORITY } from '../constants/quantiser.ts';

/**
 * Ulichney's void-and-cluster (SPIE 1993): every position of a square tile ranked so that the
 * positions holding any prefix of the ranks are spread as evenly as a set that size can be.
 *
 * What that buys over Bayer is the absence of a *figure*. The recursive matrix distributes a ratio
 * perfectly too, but it distributes it on a lattice — so a flat region dithered through it comes
 * back wearing a crosshatch that is not in the artwork, and at 1:1 on a sprite sheet that
 * crosshatch is as visible as the shading it is carrying. A void-and-cluster tile has the same even
 * coverage with no repeating figure at any ratio, which is what "blue noise" names: energy pushed
 * into the high frequencies, where the eye is least able to organise it into a pattern.
 *
 * **Generated rather than shipped.** Christoph Peters publishes CC0 blue-noise textures and one
 * would have done, but a texture is an image blob in a repository that holds no images, plus a
 * second licence to carry, plus four thousand numbers nobody can check — where this is the algorithm
 * that made them, stated in forty lines, producing the same tile on every run.
 *
 * **Deterministic, which the published algorithm is not.** It opens from a random scatter; this one
 * opens from {@link BLUE_NOISE_SEED} through a plain linear congruential generator, so the tile is
 * a fact about the code rather than about the run that produced it — two sheets quantised a week
 * apart dither through the same tile, which is the whole point of a *positional* dither.
 *
 * The energy field is a wrapped Gaussian at {@link BLUE_NOISE_SIGMA}, maintained incrementally: a
 * position toggling adds or subtracts its own kernel rather than the field being recomputed, so the
 * cost is one kernel per toggle and one scan of the tile per rank assigned.
 *
 * Returns one rank per position, `0 … size² − 1`, row-major.
 */
export function voidAndClusterRanks(size: number): Uint16Array {
  const count = size * size;
  const field = new Float64Array(count);
  const pattern = new Uint8Array(count);
  const ranks = new Uint16Array(count);
  const kernel = wrappedKernel(size);

  const toggle = (at: number, on: boolean): void => {
    pattern[at] = on ? 1 : 0;
    const cx = at % size;
    const cy = (at - cx) / size;
    for (let y = 0; y < size; y += 1) {
      const row = ((y - cy + size) % size) * size;
      for (let x = 0; x < size; x += 1) {
        const weight = kernel[row + ((x - cx + size) % size)] ?? 0;
        field[y * size + x] = (field[y * size + x] ?? 0) + (on ? weight : -weight);
      }
    }
  };

  // The opening scatter: a tenth of the tile, placed by the seeded generator. Its own arrangement
  // barely matters — the loop below moves every clustered point into the largest void until moving
  // one would put it back where it came from, which is where the pattern stops being a scatter.
  let state = BLUE_NOISE_SEED;
  const minority = Math.max(1, Math.round(count * BLUE_NOISE_MINORITY));
  for (let placed = 0; placed < minority;) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const at = state % count;
    if (pattern[at] === 1) continue;
    toggle(at, true);
    placed += 1;
  }

  for (let guard = 0; guard < count; guard += 1) {
    const cluster = extreme(field, pattern, 1, true, size);
    toggle(cluster, false);
    const empty = extreme(field, pattern, 0, false, size);
    if (empty === cluster) {
      toggle(cluster, true);
      break;
    }
    toggle(empty, true);
  }

  // Phase one runs the opening pattern *backwards*: the tightest cluster is the most redundant
  // point in it, so it is the last one any prefix of the ranks should include.
  const prototype = Uint8Array.from(pattern);
  for (let rank = minority - 1; rank >= 0; rank -= 1) {
    const cluster = extreme(field, pattern, 1, true, size);
    toggle(cluster, false);
    ranks[cluster] = rank;
  }

  pattern.set(prototype);
  field.fill(0);
  for (let at = 0; at < count; at += 1) if (pattern[at] === 1) toggle(at, true);

  // The published algorithm splits this in two at the halfway point and reverses the roles of ones
  // and zeros, because past it the *zeros* are the minority and it is their clustering that matters.
  // **Kept as one loop, and that is a consequence rather than a shortcut.** The field is held over
  // the ones and the kernel wraps, so every position carries the same total weight — which makes the
  // complement's energy that constant minus this one. The tightest cluster of zeros is therefore the
  // *minimum* of this field among them, which is the same question the largest void asks, so the
  // reversal collapses to nothing. Reading it as this field's maximum instead inverts the second
  // half outright: it fills the well-spread positions first and leaves the clumps for last, and the
  // top ranks come back as one contiguous blob. Measured on the 64-square tile, the mean self-energy
  // of the positions ranked 4000 and above is 0.0037 as written and 5.07 inverted.
  for (let rank = minority; rank < count; rank += 1) {
    const at = extreme(field, pattern, 0, false, size);
    toggle(at, true);
    ranks[at] = rank;
  }

  return ranks;
}

/** The position of the given value whose energy is highest (`highest`) or lowest, ties to the first. */
function extreme(
  field: Float64Array,
  pattern: Uint8Array,
  value: number,
  highest: boolean,
  size: number,
): number {
  let chosen = 0;
  let best = highest ? -Infinity : Infinity;
  for (let at = 0; at < size * size; at += 1) {
    if (pattern[at] !== value) continue;
    const energy = field[at] ?? 0;
    if (highest ? energy > best : energy < best) {
      best = energy;
      chosen = at;
    }
  }
  return chosen;
}

/**
 * The Gaussian kernel over the whole tile, wrapped — one weight for every offset, so a toggle's
 * contribution is a table lookup and the field needs no edge handling.
 *
 * Whole-tile rather than truncated at a few sigma: the tile is small, the table is built once, and
 * a truncated kernel makes the "every position carries the same total weight" identity the phase
 * flip above relies on true only approximately.
 */
function wrappedKernel(size: number): Float64Array {
  const weights = new Float64Array(size * size);
  const spread = 2 * BLUE_NOISE_SIGMA * BLUE_NOISE_SIGMA;
  for (let y = 0; y < size; y += 1) {
    const dy = Math.min(y, size - y);
    for (let x = 0; x < size; x += 1) {
      const dx = Math.min(x, size - x);
      weights[y * size + x] = Math.exp(-(dx * dx + dy * dy) / spread);
    }
  }
  return weights;
}
