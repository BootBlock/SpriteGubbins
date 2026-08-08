/**
 * The hue wheel, in the order it turns.
 *
 * The ten stops are defined in `src/index.css` as `--color-spectrum-*`, 36° apart at one lightness.
 * This is the same wheel expressed as data, for the one thing CSS cannot do on its own: hand a
 * *different* stop to each member of a list whose length is only known at runtime.
 *
 * That is the reference design's own idea rather than a decoration. Its fifty-six issue labels are
 * coloured by allocation — each family owns an arc, each member a position within it — so a label's
 * colour says where it sits rather than being chosen for it. The preset library is the one list in
 * this app with the same shape: an open-ended set of peers, no one of which outranks another.
 *
 * Deliberately **not** a list of Tailwind class names. A class picked at runtime never reaches the
 * scanner, so `text-spectrum-${name}` would emit no CSS and fail silently — the exact trap
 * `index.css` opens by warning about. These are custom-property references instead, assigned to
 * `--color-tab`, which re-points every `*-tab` utility already on the element that receives it.
 */
const SPECTRUM_STOPS = [
  'rose',
  'ember',
  'gold',
  'lime',
  'jade',
  'cyan',
  'azure',
  'indigo',
  'violet',
  'magenta',
] as const;

/**
 * The stop `index` places round the wheel, as the value to assign to `--color-tab`.
 *
 * Wraps, so a list longer than the wheel starts round again rather than running out of colour — the
 * preset library grows with every preset a user saves, and there is no length at which it should
 * stop being coloured.
 *
 * The `?? SPECTRUM_STOPS[0]` is not dead code and not defensive habit: `noUncheckedIndexedAccess`
 * types every computed index as possibly `undefined`, and element 0 of an `as const` tuple is the
 * one access the compiler knows is present. A non-negative integer is what callers pass and what
 * the modulo assumes; a fractional or negative one lands on the first stop rather than on nothing.
 */
export function spectrumStopAt(index: number): string {
  const stop = SPECTRUM_STOPS[index % SPECTRUM_STOPS.length] ?? SPECTRUM_STOPS[0];
  return `var(--color-spectrum-${stop})`;
}
