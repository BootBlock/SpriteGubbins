import type { SubjectCategory } from '../../types/subject.ts';

/**
 * The unit section 2's resolution profile prices the sheet in, per category.
 *
 * The three profiles that *are* a scale each state it against a reference — "25–35% of the sheet
 * height", "roughly 64–96 pixels tall" — and the thing being measured was written once, for a
 * character, and read by all thirteen. A FONT sheet of twenty-six glyphs, a TERRAIN blend set of
 * twenty-three tiles and an INTERFACE state library of twenty-three widgets were each told that
 * "a full figure occupies 25–35% of the sheet height", which is an instruction with no referent on
 * any of them. This is the same defect `SheetPlan.scaleExample` removed from section 0's worked
 * example and `[DEFINE:*_LABEL]` removed from section 1's field names, each label being filled from
 * the category's own field definitions for the same reason.
 *
 * **The noun is the category's and the range is the profile's, but the *frame* that range is stated
 * against belongs to neither** — it is `SheetPlan.scaleUnitFrame`'s answer, and stating it against
 * the sheet height on all thirteen is the defect that field removes. `RESOLUTION_PROFILE_CHOICES` used
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
 * `SheetPlan.scaleUnitFrame` is per plan too, and the batch argument above does not reach it: a
 * series is one (category, mode) pairing, so two plans of one category can only be framed
 * differently where a reader would have to choose a different mode to meet the second.
 *
 * **The six categories whose components are parts of one subject take `a full X`**, which is
 * CHARACTER's own shipped wording and not a form chosen fresh. The alternative, `the whole X`, echoes
 * the exclusion those categories already carry — "The vehicle itself, whole or partly built" — and a
 * scale reference that reads back as the prohibition beside it is the collision BACKGROUND's entry
 * below records at its worst. What every one of them names is a whole the sheet is forbidden to draw,
 * which is the point: a reference nothing on the page *is* cannot argue with the component count.
 *
 * Each entry is a singular noun phrase carrying its own article, so it reads in all three frames —
 * "… occupies 25–35% of the sheet height", "… occupies 50–65% of its cell height in the exploded
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
  // the parallax set states a band and the layer library the assembled backdrop.
  // `the finished scene` is this category's own name for the thing sections 4, 8 and 9 each forbid
  // drawing, word for word, so section 2 measuring the sheet against it by name is the one place in
  // the thirteen where the unit and the prohibition are the same string. Section 0's example for
  // this category already hangs its proportions on a band, which is the agreement INTERFACE and
  // TERRAIN also have.
  BACKGROUND: 'one parallax band',
  // The capital rather than a glyph in general, because cap height is the measurement a font's
  // remaining metrics are set against and the one section 1 fixes.
  FONT: 'one capital glyph',
};
