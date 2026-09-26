import type { CoverageMask } from '../types/quantiser.ts';

/**
 * The most mask words `registerFrame` touches registering this frame against this reference at
 * this reach — the figure the frame budget is spent in.
 *
 * Two terms, one for each loop there. Every one of the `(2 × reach + 1)²` candidates compares at most
 * each of the frame's `height × stride` words, and once per column of candidates the reference is
 * re-packed at the frame's stride over the rows any candidate can lay on the frame, which is at most
 * `frame.height + reach` of them. A bound rather than a count: a candidate moved up or down compares
 * only the rows the two masks share, and `frameRegister.test.ts` counts the comparisons it makes
 * against the first term.
 *
 * Pure.
 */
export function registrationWords(reference: CoverageMask, frame: CoverageMask, reach: number): number {
  const side = 2 * reach + 1;
  const rows = Math.min(reference.height, frame.height + reach);
  return side * side * frame.height * frame.stride + side * rows * frame.stride;
}
