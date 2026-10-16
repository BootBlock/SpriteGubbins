/**
 * The middle value, or the mean of the two middle ones — `0` for an empty list, which a caller with
 * nothing to measure guards before asking.
 *
 * Averaging the middle pair of an even-length list rather than taking one of them, so the answer
 * does not depend on which side of the middle a tie falls — a row laid out alternately 21 and 22
 * pixels apart keeps to 21.5, and either whole number would be a claim the row does not support.
 *
 * Shared by the two readings that ask for a spacing robust to an outlier: `frameLattice`, fitting a
 * strip's frames, and `spritePitch`, measuring the step of a sheet's grid.
 *
 * Pure, as everything in this directory is.
 */
export function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}
