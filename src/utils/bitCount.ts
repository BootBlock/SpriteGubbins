/**
 * How many bits of a 32-bit word are set.
 *
 * The parallel count: pairs, then nibbles, then bytes, each step summing neighbours in place, and
 * the four byte counts added by one multiply that gathers them into the top byte. `Math.imul`
 * rather than `*`, because the product overflows a double's exact integers and the top byte is the
 * only part wanted. Pure.
 */
export function bitCount(word: number): number {
  let value = word - ((word >>> 1) & 0x55555555);
  value = (value & 0x33333333) + ((value >>> 2) & 0x33333333);
  return Math.imul((value + (value >>> 4)) & 0x0f0f0f0f, 0x01010101) >>> 24;
}
