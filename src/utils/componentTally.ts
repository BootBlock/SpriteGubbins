/**
 * A component count with its noun, agreeing in number — `1 component`, `16 components`.
 *
 * Written once because two places print a sheet's count beside its noun — section 0's contract and the
 * series list in section 6 — and a sheet of one component is reachable: an icon set whose last sheet
 * holds one icon. A fixed `components` after the figure printed “Exactly 1 components” there.
 */
export function componentTally(count: number): string {
  return `${String(count)} ${count === 1 ? 'component' : 'components'}`;
}
