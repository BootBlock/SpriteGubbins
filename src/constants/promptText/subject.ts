import type { ScaleUnitKind, SubjectCategory } from '../../types/subject.ts';

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
 * **The noun is the category's and the range is the profile's, but the *frame* that range is stated
 * against belongs to neither** — it is {@link SCALE_UNIT_FRAME}'s answer, and stating it against the
 * sheet height on all thirteen is the defect that record removes. `RESOLUTION_PROFILE_CHOICES` used
 * to put the range in the option's own label, which is why the first pass at this map left both
 * ranges where they were; the label states the rung rather than a number now, precisely because
 * there are two of each and a label cannot state one of them without lying about the other.
 *
 * **One unit per category rather than one per sheet plan, and the batch is why.** A profile is
 * chosen once and every sheet of a deliverable is generated under it, so a unit that changed between
 * a category's plans would price sheet one against a wall bay and sheet two against a floor tile —
 * two scales for one building, which is exactly the disagreement section 0's rule exists to stop.
 * `SheetPlan.targetQuantity` is per plan and is a different question: it asks whether the whole the
 * components assemble into has one definite size, which is what a reader's *stated* size names.
 *
 * **The six categories whose components are parts of one subject take `a full X`**, which is
 * CHARACTER's own shipped wording and not a form chosen fresh. The alternative, `the whole X`, echoes
 * the exclusion those categories already carry — "The vehicle itself, whole or partly built" — and a
 * scale reference that reads back as the prohibition beside it is the collision BACKGROUND's entry
 * below records at its worst. What every one of them names is a whole the sheet is forbidden to draw,
 * which is the point: a reference nothing on the page *is* cannot argue with the component count.
 *
 * Each entry is a singular noun phrase carrying its own article, so it reads in all three frames —
 * "… occupies 25–35% of the sheet height", "… occupies 65–85% of its cell height in the exploded
 * grid" and "… is roughly 64–96 pixels tall".
 */
export const SCALE_UNIT_TEXT: Readonly<Record<SubjectCategory, string>> = {
  CHARACTER: 'a full figure',
  // Not the "figure" CHARACTER keeps and `CATEGORY_ASSEMBLY` shares with it: that record is naming a
  // *failure* the two categories have in common, where this one is naming the subject itself, and
  // the word does not appear anywhere in this category's plans.
  CREATURE: 'a full creature',
  OBJECT: 'a full object',
  ITEM: 'a full item',
  // The one category whose components are parts of a subject on every plan and whose *stated* size is
  // still a component — a bay on the module library, a tile on the tile set. Neither of those two
  // nouns can be the unit, because the sheets of one building would then be drawn at two scales; the
  // building they are both cut from is the reference they share, and is what section 0's own example
  // already hangs a wall bay on.
  BUILDING: 'a full building',
  VEHICLE: 'a full vehicle',
  // "one frame" alone would be read as a cell of the sheet grid rather than as a moment of the
  // effect, which is the reading `FRAME_IS_A_COMPONENT` exists to correct elsewhere.
  EFFECT: 'one frame of the effect',
  // Section 0's own pairing for this category is a cursor against the panel frame it moves over, so
  // the frame is the piece the rest are in proportion to. "One widget" would price a cursor and a
  // window frame at one size.
  INTERFACE: 'a panel frame',
  TERRAIN: 'one ground tile',
  // Deliberately not "a bust": the crop is the reader's, from `Framing & Crop` — head and shoulders,
  // bust to upper chest, or half body — so a unit naming one of those values prices the sheet
  // against a crop the subject may not have asked for.
  PORTRAIT: 'one portrait',
  ICON: 'one icon',
  // The band rather than the scene those bands stack into, though the two plans price differently —
  // the parallax set states a band and the layer library the assembled backdrop. `the finished scene`
  // is this category's own name for the thing sections 4, 8 and 9 each forbid drawing, word for word,
  // so section 2 measuring the sheet against it by name is the one place in the thirteen where the
  // unit and the prohibition are the same string. Section 0's example for this category already hangs
  // its proportions on a band, which is the agreement INTERFACE and TERRAIN also have.
  BACKGROUND: 'one parallax band',
  // The capital rather than a glyph in general, because cap height is the measurement a font's
  // remaining metrics are set against and the one section 1 fixes.
  FONT: 'one capital glyph',
};

/**
 * Whether each category's sheet *draws* the unit above, which is what the share-bearing profiles
 * state their range against.
 *
 * **The split is the one {@link SCALE_UNIT_TEXT}'s own entries already fall into**, and it is
 * written down rather than inferred from them for the reason `ScaleUnitKind` records: the six
 * `a full X` phrases mark the reference frame today by accident of wording, and a unit reworded
 * later would move a category between frames with nothing to say it had.
 *
 * **`REFERENCE` is the safe reading, and the six that take it are safe for one reason only** — each
 * names a whole every one of sections 4, 8 and 9 forbids the sheet to draw. A share of the sheet
 * height is then a statement about a thing that is not on the page, so no arithmetic connects it to
 * the component count: a hand is drawn at whatever fraction of that figure it occupies, and thirty
 * such pieces still fit.
 *
 * **`DRAWN` is the seven whose components are not pieces of each other.** An effect's frames, a
 * widget kit, a tile set, a portrait's expressions, an icon set, a parallax stack and an alphabet
 * each put the unit on the page `N` times, so `N` copies at the stated share have to fit beside each
 * other — and at the counts these plans actually carry they do not. INTERFACE is `DRAWN` although its
 * unit is the single largest widget rather than a repeated one: the panel frame is still a component
 * the sheet draws, so it is charged a cell like every other entry in the grid.
 */
export const SCALE_UNIT_FRAME: Readonly<Record<SubjectCategory, ScaleUnitKind>> = {
  CHARACTER: 'REFERENCE',
  CREATURE: 'REFERENCE',
  OBJECT: 'REFERENCE',
  ITEM: 'REFERENCE',
  BUILDING: 'REFERENCE',
  VEHICLE: 'REFERENCE',
  EFFECT: 'DRAWN',
  INTERFACE: 'DRAWN',
  TERRAIN: 'DRAWN',
  PORTRAIT: 'DRAWN',
  ICON: 'DRAWN',
  BACKGROUND: 'DRAWN',
  FONT: 'DRAWN',
};
