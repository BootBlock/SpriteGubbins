/**
 * Whether a value sits on a control's own step grid, counting from `min`.
 *
 * A range is three numbers, not two, and the third is the one both boundaries of this app used to
 * drop. A `type="number"` input reports a value off its own step grid as *invalid* and still hands
 * it over verbatim, and a stored value never went through a control at all — so `NumberField` and
 * `db/readers.ts` each need the same question answered, and a second spelling of it is how one of
 * them ends up with a tolerance the other does not have.
 *
 * The comparison is taken against `min` rather than against zero, because a grid may be offset:
 * `ANTI_ALIAS_STRENGTH_RANGE` opens at 10 and moves in fives, so 37 is off its grid while 35 is on
 * it, and neither answer follows from 37 alone.
 *
 * **The tolerance is relative to the step**, so it holds for a step far from 1 as well: at `step`
 * 0.1, `(0.3 - 0) / 0.1` comes to 2.9999999999999996 in binary floating point, and rounding that to
 * 3 before comparing is what stops a value the reader typed — or the slider produced — being
 * refused. The value that passes is handed back **as read**, never snapped to the position it
 * matched: 0.3 is already the nearest double to 0.3, and `min + n × step` recomputed in floating
 * point is not.
 *
 * A step of zero or less is no grid, so everything is on it. That is the honest answer rather than
 * a guard against a division: a control declaring no step is declaring a continuous range.
 */
export function isOnStep(value: number, min: number, step: number): boolean {
  if (step <= 0) return true;
  const steps = (value - min) / step;
  return Math.abs(steps - Math.round(steps)) < 1e-9;
}
