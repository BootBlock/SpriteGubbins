import type { SubjectCategory } from '../../types/subject.ts';

/**
 * Section 0's worked example of one consistent scale, per category.
 *
 * "One consistent scale across every component" is an abstract rule, and the example after the colon
 * is what makes it land — so the example has to name pieces the sheet actually contains. It was
 * written once, for a character, and reached every category: a vehicle sheet was told to keep a
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
  // The one category whose example is not a small piece against a large one, because its components
  // are not pieces of each other: an effect's frames are one phenomenon at successive moments, so
  // what has to hold across them is that the *same* effect is drawn at the same scale in every cell.
  EFFECT: 'the first frame and the peak frame are the same effect drawn at the same scale',
  INTERFACE: 'a cursor drawn beside the panel frame it moves over is in proportion to it',
  // A terrain's tiles are all one size by construction, so the scale that can actually go wrong is
  // between a tile and the loose features standing on it.
  TERRAIN: 'a boulder drawn beside the ground tile it stands on is in proportion to it',
};
