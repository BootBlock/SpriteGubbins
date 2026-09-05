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
 * The six pools that offer such a value on a category whose plans draw nothing are deliberately not
 * among them: nothing is dropped there, so the sentence would be false.
 */
export const ABSENT_OPTION_DROPS_THE_PIECES =
  'A value meaning there is none takes these pieces off the sheet, and the component count falls with them.';
