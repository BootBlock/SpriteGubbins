/** The largest whole number that divides both `a` and `b`, by Euclid's algorithm. */
export function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}
