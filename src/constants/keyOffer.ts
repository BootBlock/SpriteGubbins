/**
 * When the tab offers to key a sheet that arrived with its field still on it, and what it says.
 *
 * Here rather than inline in the component for the reason every other block of user-facing copy in
 * this app is: it is content, it ships in the bundle, and it is read by strangers. It sits beside
 * `quantiser.ts`'s own guidance sets rather than in `constants/tooltips/`, because — like
 * `PALETTE_LOCK_GUIDANCE` and `QUANTISE_SCALE_GUIDANCE` — it describes the *state the reader's own
 * image is in* rather than explaining a control. The button it appears beside is explained by
 * `QUANTISE_ACTION_TOOLTIPS.keyTheBackground`.
 *
 * **Why an offer and not a default.** Keying opens off, as every pass that changes the artwork on
 * this tab opens off: nothing here can tell a sheet that needs a pass from one that came back clean,
 * and the reader is the one who knows. That argument holds for switching it on *unasked*; it says
 * nothing against telling a reader what the sheet in front of them looks like. So this reports a
 * measurement and puts the pass one press away, and the press is still theirs.
 */

/**
 * How much of a sheet's outer border has to match the studio's key before the offer appears.
 *
 * **Chosen for the shape of the failure rather than fitted to a sample**, and the shape is lopsided:
 * a sheet drawn on a key field has that colour at essentially every edge pixel, while a sheet that
 * merely *uses* the colour has it inside the artwork, where this reading does not look. So the
 * threshold sits high — nine-tenths leaves room for a component that reaches the edge, a corner the
 * generator filled with something else, and the resampler's ringing at the frame, without ever
 * approaching the share a sheet with no field could reach.
 *
 * It is deliberately not a dial. An offer that appeared at some thresholds and not others would be
 * a second setting governing the one that matters, and the press it leads to is reversible.
 */
export const KEY_OFFER_BORDER_SHARE = 0.9;

/**
 * The sentence beside the button.
 *
 * It names the consequence rather than the measurement, because the measurement is not what a reader
 * is deciding on: every reading further down the tab — the sprite count, the duplicates, the
 * symmetry, the frame alignment — is taken from what is transparent, so a sheet with its field still
 * on it reports nothing anywhere. That is the state this is rescuing them from, and it is invisible
 * from the panels that are failing to report.
 */
export const KEY_OFFER_NOTICE =
  'The border of this sheet is the background key the studio asked for, so it has arrived with its field still on it. Keying that field out is what makes the rest of this tab work: sprites are found in what is transparent, and the duplicate, symmetry and frame readings are all readings of those sprites, so they stay silent until it goes. Nothing is changed until you press it, and the tolerance beside it is yours to move afterwards.';
