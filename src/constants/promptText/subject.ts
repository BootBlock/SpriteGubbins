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
  // EFFECT's shape rather than the others', and for EFFECT's reason: this sheet's components are one
  // subject drawn repeatedly rather than the parts of one, so there is no pair of pieces to be in
  // proportion to each other. What has to hold instead is that the repeats agree.
  PORTRAIT: 'the resting portrait and every expression beside it are the same head drawn at the same scale',
  ICON: 'every icon fills the same cell to the same margin, so none arrives at half the weight of the one beside it',
  BACKGROUND: 'a tree on a band and the rooftops on that same band are in proportion to each other',
  // ICON's shape, for ICON's reason and one more of its own: this sheet's components are not pieces
  // of each other either, and what has to hold between them is stricter than agreement about weight —
  // a glyph a pixel off the shared baseline is visible in every word the engine ever sets.
  FONT: 'every glyph stands on the same baseline at the same cap height, so none arrives taller or heavier than the one beside it',
};

/**
 * The unit section 2's resolution profile prices the sheet in, per category.
 *
 * The three profiles that *are* a scale each state it against a reference — "25–35% of the sheet
 * height", "roughly 64–96 pixels tall" — and the thing being measured was written once, for a
 * character, and read by all thirteen. A FONT sheet of twenty-six glyphs, a TERRAIN blend set of
 * twenty-three tiles and an INTERFACE state library of twenty-three widgets were each told that
 * "a full figure occupies 25–35% of the sheet height", which is an instruction with no referent on
 * any of them. This is the same defect {@link SCALE_EXAMPLE_TEXT} removed from section 0's worked
 * example and `[DEFINE:*_LABEL]` removed from section 1's field names, each label being filled from
 * the category's own field definitions for the same reason.
 *
 * **The range stays on the profile and only the noun is the category's**, which is what decides the
 * shape of this map. `RESOLUTION_PROFILE_CHOICES` puts the range in the option's own label — a
 * reader picks `HIGH_RESOLUTION (25–35% of sheet height)` — so a range that moved with the category
 * would make that label state something the prompt does not. The noun is named nowhere in the
 * interface, so it is free to be the category's own.
 *
 * **One unit per category rather than one per sheet plan, and the batch is why.** A profile is
 * chosen once and every sheet of a deliverable is generated under it, so a unit that changed between
 * a category's plans would price sheet one against a wall bay and sheet two against a floor tile —
 * two scales for one building, which is exactly the disagreement section 0's rule exists to stop.
 * `SheetPlan.targetQuantity` is per plan and is a different question: it asks whether the whole the
 * components assemble into has one definite size, which is what a reader's *stated* size names.
 *
 * Each entry is a singular noun phrase carrying its own article, so it reads in both frames — "…
 * occupies 25–35% of the sheet height" and "… is roughly 64–96 pixels tall".
 */
export const SCALE_UNIT_TEXT: Readonly<Record<SubjectCategory, string>> = {
  CHARACTER: 'a full figure',
  // Not the "figure" CHARACTER keeps and `CATEGORY_ASSEMBLY` shares with it: that record is naming a
  // *failure* the two categories have in common, where this one is naming the subject itself, and
  // the word does not appear anywhere in this category's plans.
  CREATURE: 'a full creature',
  OBJECT: 'the whole object',
  ITEM: 'the whole item',
  // The one category whose components are parts of a subject on every plan and whose *stated* size is
  // still a component — a bay on the module library, a tile on the tile set. Neither of those two
  // nouns can be the unit, because the sheets of one building would then be drawn at two scales; the
  // building they are both cut from is the reference they share, and is what section 0's own example
  // already hangs a wall bay on.
  BUILDING: 'the whole building',
  VEHICLE: 'the whole vehicle',
  // "one frame" alone would be read as a cell of the sheet grid rather than as a moment of the
  // effect, which is the reading `FRAME_IS_A_COMPONENT` exists to correct elsewhere.
  EFFECT: 'one frame of the effect',
  // Section 0's own pairing for this category is a cursor against the panel frame it moves over, so
  // the frame is the piece the rest are in proportion to. "One widget" would price a cursor and a
  // window frame at one size.
  INTERFACE: 'a panel frame',
  TERRAIN: 'one ground tile',
  // Deliberately not "a bust": the crop is the reader's, from `Framing / Crop` — head and shoulders,
  // bust to upper chest, or half body — so a unit naming one of those values prices the sheet
  // against a crop the subject may not have asked for.
  PORTRAIT: 'one portrait',
  ICON: 'one icon',
  // The category whose two plans price differently — the parallax set states a band, the layer
  // library states the scene those bands stack into — so the reference they share is the scene, and
  // it is the one a band's own height is a share of.
  BACKGROUND: 'the finished scene',
  // The capital rather than a glyph in general, because cap height is the measurement a font's
  // remaining metrics are set against and the one section 1 fixes.
  FONT: 'one capital glyph',
};
