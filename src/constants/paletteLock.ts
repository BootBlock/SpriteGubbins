/**
 * What the palette-lock panel says, and how much of a held palette it shows.
 *
 * Here rather than inline in the component for the reason every other block of user-facing copy in
 * this app is: it is content, it ships in the bundle, and it is read by strangers. It sits beside
 * `quantiser.ts`'s own guidance sets rather than in `constants/tooltips/`, because — like
 * `QUANTISE_SCALE_GUIDANCE` — it describes the *state* the tab is in rather than explaining a
 * control. The controls themselves are explained by `QUANTISE_TOOLTIPS.paletteEscape` and the three
 * lock entries in `QUANTISE_ACTION_TOOLTIPS`.
 */

/**
 * How many of a held palette's colours the swatch strip shows before it counts the rest.
 *
 * A lock taken from a sheet with no colour budget can hold thousands of entries — the quantiser
 * reduces nothing under `UNRESTRICTED` — and a strip of thousands of dots is not a palette anyone
 * can read. The entries are held most-used first, so the ones shown are the ones the sheet is
 * actually made of, and the remainder is stated as a number rather than silently dropped.
 */
export const LOCKED_SWATCHES_SHOWN = 64;

/** The paragraph under the lock panel, keyed to whether a palette is held. */
export const PALETTE_LOCK_GUIDANCE = {
  /** Nothing held: what locking would do, and why anyone would want it. */
  open: 'A sprite sheet series is generated one sheet at a time, and a palette chosen afresh from each of them drifts — two sheets of one character come back with two sets of greens that are near-identical and not the same, so the armour changes shade between the walk sheet and the run sheet. Lock the colours of a sheet you are happy with, then drop the next sheet in: each of its colours that comes near a held one is taken to it, so the two sheets share a palette. The lock stays until you unlock it or clear the tab, and it takes over from the studio’s colour setting while it is held.',
  /** Held: what it is doing to this sheet, and the one thing that is not obvious about it. */
  held: 'Each colour in this sheet that sits within the snap distance of a held colour is taken to it, measured the way every colour distance on this tab is. Anything further away keeps the colour it arrived with, so a gem or a flame the locked sheet never had is not flattened into it — which also means a lock does not fix how many colours come out. While the lock is reaching, the studio’s own colour setting does not run — the held colours are what the sheet is drawn in — and neither does the sheet-wide colour merge, since folding two held colours together here would quietly edit the palette the rest of the series is mapped onto. Turn the snap distance off and both come back.',
  /**
   * The studio's colour setting has moved since the lock was taken.
   *
   * The one state where the supersession is a surprise rather than the point — a palette locked
   * under one machine's colours, still applied after the studio has been pinned to another, hands
   * back colours the new machine could not show. So it names both settings and the two ways out,
   * rather than resolving it silently in either direction.
   */
  superseded: (setting: string): string =>
    `The studio’s colour setting is now ${setting}, which is not the one this palette was locked under — the held colours are being applied instead of it. Re-lock from this sheet to take the setting’s own colours, or unlock to hand the decision back to it.`,
} as const;
