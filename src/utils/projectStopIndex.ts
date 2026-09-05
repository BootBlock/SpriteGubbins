/**
 * Which position on the hue wheel a project's colour comes from, derived from its id.
 *
 * A project's cards read as a set because they share a stop, exactly as a preset card takes one
 * from its position in the library — so this feeds `spectrumStopAt` like any other allocation, and
 * the wheel's own rules about the reserved stop apply unchanged.
 *
 * **From the id rather than from the project's place in the list**, which is the whole reason this
 * exists. The list is ordered by when each project was last edited, so a position would change
 * under a rename, and every card in the project would change colour because its name did. The id
 * never changes, so neither does the colour.
 *
 * FNV-1a over the id's code units, which is a hash rather than a checksum: what is wanted is that
 * two ids land on different stops as often as chance allows, not that a collision is detectable.
 * Two projects out of ten will share a stop whatever function is used — the pool is nine — so a
 * collision is a normal outcome here and not a failure to handle.
 *
 * Written with `Math.imul` and `>>> 0` because JavaScript's `*` returns a double: the multiply
 * would lose the low bits it is being done for, and the shift is what keeps the running value an
 * unsigned 32-bit integer rather than letting it go negative and hand back a negative index.
 */
const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;

export function projectStopIndex(id: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let position = 0; position < id.length; position += 1) {
    hash = Math.imul(hash ^ id.charCodeAt(position), FNV_PRIME) >>> 0;
  }
  return hash;
}
