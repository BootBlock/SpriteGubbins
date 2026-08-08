import type { SubjectCategory } from '../../types/subject.ts';

/**
 * Section 0's worked example of one consistent scale, per category.
 *
 * "One consistent scale across every component" is an abstract rule, and the example after the colon
 * is what makes it land — so the example has to name pieces the sheet actually contains. It was
 * written once, for a character, and reached all six categories: a vehicle sheet was told to keep a
 * hand in proportion to a torso it has neither of, which is the same defect as section 1 labelling a
 * turret "Anatomy base".
 *
 * Each phrase names the smallest and the largest piece that category's own sheet plans ask for — a
 * fitting against the body it is mounted on — and reads on from "One consistent scale across every
 * component: ", so each is a lower-case clause with no trailing stop.
 */
export const SCALE_EXAMPLE_TEXT: Readonly<Record<SubjectCategory, string>> = {
  CHARACTER: 'a hand drawn beside a torso is in proportion to it',
  CREATURE: 'a foot or claw drawn beside the body it belongs to is in proportion to it',
  OBJECT: 'a latch drawn beside the housing it fastens is in proportion to it',
  ITEM: 'a pommel drawn beside the body or shaft it caps is in proportion to it',
  BUILDING: 'an awning drawn beside the wall bay it hangs on is in proportion to it',
  VEHICLE: 'a lamp housing drawn beside the hull it is mounted on is in proportion to it',
  // The one category with no "fitting against the body it is mounted on" to name, because its
  // components are moments rather than pieces — nothing on the sheet is part of anything else on it.
  // So the pair it draws its example from is the two ends of the *sequence*: the scale that has to
  // hold is between the first frame and the widest one, which is exactly where a flipbook loses it.
  EFFECT: 'a first frame drawn beside the peak frame it grows into is in proportion to it',
};
