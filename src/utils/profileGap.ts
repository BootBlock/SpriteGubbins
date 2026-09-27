/**
 * The summed difference between two profiles with the second laid `offset` places along the
 * first, every place outside one of them reading as nothing.
 *
 * A lower bound on the sum of alpha differences over the whole union box at that offset along this
 * axis, whatever the offset along the other: see `AlphaProfile`.
 */
export function profileGap(left: Int32Array, right: Int32Array, offset: number): number {
  let gap = 0;
  for (let at = Math.min(0, offset); at < Math.max(left.length, offset + right.length); at += 1) {
    gap += Math.abs((left[at] ?? 0) - (right[at - offset] ?? 0));
  }
  return gap;
}
