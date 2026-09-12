/**
 * The sentences more than one control's guidance carries, written down once.
 *
 * Guidance is filed in two places — an action's under `constants/tooltips/`, a setting's beside the
 * options it explains — and a fact that is true of two controls belongs to neither filing. So it
 * lives here, on neutral ground, and each entry is imported by every card that states it.
 *
 * **This file is what makes a repeated sentence legible**, and it takes two checks rather than one.
 * `constants/tooltips/tooltips.test.ts` fails when a sentence turns up under two names, because that
 * is the copy-paste that leaves one control describing another and reads correctly at each call site
 * on its own; a sentence traced back to a constant here is one origin however many cards carry it,
 * which is how deliberate sharing is told apart from that. But that check reads the compiled
 * *values*, so it recognises a sentence by its text and cannot tell an import from a copy somebody
 * typed out — and a typed-out copy can be false of the control it lands on.
 * `tests/guidance-sentence-sharing.test.ts` reads the *source* and fails on any of these sentences
 * written out anywhere but this file, so the exemption reaches what was imported and nothing else.
 *
 * Two consequences worth holding on to:
 *
 * - **An entry here has to be shared.** The test fails on a constant fewer than two pieces of
 *   guidance carry, because an exemption covering nothing is how a list like this rots into a
 *   permission nobody uses.
 * - **A card may not be built out of these alone.** Every piece of guidance has to carry at least
 *   one sentence of its own, since a control whose card says only what it has in common with other
 *   controls has not been explained.
 *
 * Each entry is exactly one sentence, and the test asserts that too: a constant holding two would
 * let the second travel silently wherever the first was wanted.
 */

/**
 * What the `NONE` option of a template control does, on the two controls that offer one.
 *
 * The System Profile and Art Style Reference controls both fill several other controls in when a
 * value is chosen, so both owe the reader the same reassurance about the option that fills in
 * nothing. It is the same promise in the same words because it is the same behaviour.
 */
export const NONE_LEAVES_SETTINGS_ALONE = 'NONE writes nothing else and leaves your settings alone.';

/**
 * What the `CHECK` scope of a quantiser pass does, on the two passes that offer one.
 *
 * The symmetry and frame-alignment readings both offer a scope that measures and reports without
 * touching anything, and it is the sentence a reader needs before pressing either — so it says the
 * same thing about the sheet, the download and stored data in both places.
 */
export const CHECK_CHANGES_NOTHING =
  'CHECK reports and changes nothing — not one pixel of the sheet, the download or anything stored.';

/**
 * When a download button is unavailable, on the two that state it this briefly.
 *
 * The Aseprite and sprite-pack downloads are disabled by the same two conditions, and neither has
 * anything to add to them. The PNG download states the same pair at greater length, because it goes
 * on to say what the button itself reports and why a large magnified sheet takes a moment — a longer
 * sentence saying more, not a second copy of this one.
 */
export const WRITE_UNAVAILABLE_UNTIL_SETTLED =
  'It is unavailable until a grid is settled, and again while a file is being written.';

/** The keyboard route to Redo, which is the same in the quantiser's dial history and the studio's. */
export const REDO_KEYBOARD_SHORTCUTS = 'Ctrl+Shift+Z and Ctrl+Y both do the same.';

/**
 * What an accent-colour field does with a hex code, which is every category's accent-colour field.
 *
 * Thirteen categories offer one, each opening its card by naming what that category's accents
 * actually are — a creature's warning colours, a building's lit windows, a font's inline. What
 * follows is a fact about the control rather than about the subject: `parseColorFromText` reads a
 * hex code out of the value and the swatch beside the field previews it, whatever the category. The
 * thirteen used to state it in three near-identical wordings, which is the drift this replaces.
 */
export const HEX_CODE_PINS_THE_HUE =
  'A hex code pins the hue far more tightly than a name does, and the swatch beside this field previews whatever it recognises.';

/**
 * What the sheet identity panel is for, on both the batch and the single-generation card.
 *
 * The panel says the same thing about a download whichever of the two the studio is composing; what
 * differs afterwards is whether there is a position to keep in step with.
 */
export const DOWNLOADS_RECORD_THE_STUDIO =
  'Every download from this tab records the studio’s configuration beside the artwork, and this is what it will record.';

/**
 * What a value meaning *the subject has none of this* does to the sheet, on the two fields whose
 * inventory draws the attribute as pieces of its own and offers a way to decline it.
 *
 * A sheet plan is otherwise unconditional, so a vehicle's cladding panel and a background's
 * atmosphere layer were ordered whatever the reader had chosen — the prompt stating in section 1
 * that the subject had none and in section 4 that it was to be drawn. The entries are dropped now,
 * which changes the component count, and that is the one thing about the behaviour a reader cannot
 * see from the field: it is the same fact in the same words because it is the same mechanism. See
 * `utils/sheetPlanClothing.ts`.
 *
 * **It says *a value*, not *choosing one*, because BACKGROUND's is its default** — a reader who
 * never opens the field has already declined the atmosphere layer, and a sentence about choosing
 * would describe a state that is in force before they arrive.
 *
 * The five pools that offer such a value on a category whose plans draw nothing are deliberately not
 * among them: nothing is dropped there, so the sentence would be false. **TERRAIN is the sixth and
 * is out for the opposite reason** — its blend set does drop seven tiles, but they are the variants
 * that *differ in* the scatter rather than pieces of it, so “these pieces” would name something the
 * sentence before it never described. Its card states the drop in its own words instead, naming the
 * tiles and what is left.
 */
export const ABSENT_OPTION_DROPS_THE_PIECES =
  'A value meaning there is none takes these pieces off the sheet, and the component count falls with them.';

/**
 * What the *Assembly Base* field does to the sheet on a category that declares no base of its own —
 * which is nothing.
 *
 * Every category has the field, under eleven labels between them: *Anatomy Base* on CHARACTER and
 * CREATURE, *Set Assembly Base* on FONT and ICON, then *Structure Base*, *Drive & Assembly Base*,
 * *Tile Assembly Base*, *Frame Assembly Base* and the rest one apiece. Each names how the deliverable
 * is meant to come apart and reaches section 1 verbatim. **Where a category declares no base in
 * `sheetPlans/assemblyBases.ts`, nothing reads the value that decides what section 4 orders**, and
 * this is the sentence its card carries. A category that declares one carries
 * {@link ASSEMBLY_BASE_CHOOSES_THE_SHEETS} instead (issue #283).
 *
 * **The sentence claims the base is not an input, and no more than that.** It says no entry of the
 * component list is a function of *it*, rather than naming what the list is a function of — because
 * two of the other inputs are things this app tells the reader about on the very cards this sentence
 * lands on. The `clothing` value removes entries where a pool declares an `absentOption` (see
 * {@link ABSENT_OPTION_DROPS_THE_PIECES}), and the `Additional …` field beside the base *adds* them —
 * which CHARACTER's own card points at in the sentence after this one.
 *
 * Three cards once said the opposite and stated figures to prove it: CHARACTER promised “the default
 * 9 core and 34 limb components” — 9 is the `THREE_CLASSIC` figure where the studio's own default set
 * gives 15 — CREATURE said the field decides how many legs get their own sprite slots while
 * `Amorphous — No Fixed Limbs` still ordered four limbs, and OBJECT said `Single Rigid Object` emits
 * one piece where it compiled to 30, 14 and 7 across its three modes. The OBJECT card is true now,
 * because that base draws its own sheets; the CHARACTER and CREATURE claims stay false until those
 * categories declare bases, which is why their cards carry this sentence.
 * `tests/subject-field-inventory.test.ts` holds every card to the declarations behind it.
 *
 * **It is on every card whose category declares no base, and not only the ones that lied**, because a
 * label ending in *Base* invites exactly that reading — naming what a control does not touch is what
 * the guidance rules ask for, and a card that stays silent leaves the reader to guess.
 */
export const ASSEMBLY_BASE_ADDS_NO_COMPONENTS =
  'The base reaches the prompt as a statement of how the set is meant to come apart, and no entry of the sheet’s own component list is a function of it — so choosing another adds no slot and removes none.';

/**
 * What the *Assembly Base* field does on a category that declares bases of its own in
 * `sheetPlans/assemblyBases.ts` (issue #283) — the counterpart of {@link ASSEMBLY_BASE_ADDS_NO_COMPONENTS}.
 *
 * **Two things a declared base can do, and one sentence for both.** A base can be drawn by only some of
 * its category's sheet modes — the state library cuts no `Nine-Slice Stretching Frame`, and a rigid
 * object has no rig sheet — in which case the studio offers only those modes and moves the sheet onto
 * one of them. Or it can come apart differently from the standard sheets and bring its own list — a
 * `Single Rigid Object` is drawn whole at each facing where the standard sheets draw a housing, a hatch
 * and a moving subassembly. A card naming only one would be false of the categories whose bases do the
 * other, and naming the values here would be a second copy of the table for the card to fall out of
 * step with.
 *
 * **It says “can”, and that is the claim rather than a hedge on it**: some values of every declaring
 * pool still draw the standard sheets, and some share a table with other declared values, so choosing
 * between two that draw one table moves nothing. `tests/subject-field-inventory.test.ts` puts it on
 * exactly the cards whose category has a base that narrows the Sheet Contents or draws a list of its
 * own, and checks that each half is true of some category.
 */
export const ASSEMBLY_BASE_CHOOSES_THE_SHEETS =
  'Some bases are drawn only by certain Sheet Contents or bring a component list of their own, so choosing another can move the sheet and change what it counts.';

/**
 * What the field naming the subject does to the sheet, on all thirteen categories — which is to name
 * the subject, and nothing in the inventory.
 *
 * `species` opens every form, under thirteen labels: *Species / Archetype*, *Creature Class*,
 * *Object Category*, *Item Type*, *Effect Type*, *Font Family* and the rest one apiece. It reaches
 * section 1 verbatim, where every piece the sheet orders is drawn as part of the subject it names, and
 * **nothing that decides what section 4 orders reads it** — the fact
 * {@link ASSEMBLY_BASE_ADDS_NO_COMPONENTS} states of the base, for the same reason. What the field
 * does change is how those pieces are drawn, and each card says that in a sentence of its own,
 * because what a watchtower's massing or a void entity's stance is differs by category.
 *
 * Six cards said the opposite after #233 had corrected the base's (issue #282): CREATURE's said a
 * quadruped, an insectoid and a void entity “break down into completely different component sets”,
 * OBJECT's that the category “decides the component breakdown as much as the look”, ITEM's, VEHICLE's
 * and INTERFACE's that it decides “the component split”, and EFFECT's that the number of frames “is a
 * property of this choice”. ICON's said it fixed how an icon “is built” and FONT's that it fixed “the
 * whole set’s construction”, which invite the same reading, and BACKGROUND's made the claim until #280
 * rewrote it. Every value of every pool
 * compiles a byte-identical section 4, and `tests/subject-field-inventory.test.ts` holds that true.
 *
 * **It is on all thirteen for the reason the base's sentence is**: this is the first field a reader
 * sets and the one they expect to shape the sheet most, so a card that stays silent about the
 * inventory leaves them to guess the answer six cards got wrong.
 */
export const SUBJECT_TYPE_ADDS_NO_COMPONENTS =
  'What you choose here reaches the prompt as what the subject is, and no entry of the sheet’s own component list is a function of it — so another choice adds no slot and removes none.';
