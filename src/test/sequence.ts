/**
 * A deterministic stream of numbers in `[0, 1)`, so a test that samples colours names the same ones
 * on every run and a failure can be reproduced from its seed.
 *
 * A linear congruential generator with the C standard library's constants. Its low bits are weak,
 * which no caller here reads: each value is used whole, scaled to a byte.
 */
export function sequence(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_103_515_245) + 12_345) >>> 0;
    return state / 2 ** 32;
  };
}
