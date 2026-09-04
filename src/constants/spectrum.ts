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
 *
 * All ten are named here because this is the wheel, and the wheel has ten stops — the gradient in
 * `index.css` paints every one of them. What may be *assigned* is the shorter list below.
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
 * The stop the palette reserves, and which therefore may never be assigned to `--color-tab`.
 *
 * Cyan is the *live* colour — `neon`, at `oklch(0.82 0.128 202)` against this stop's
 * `oklch(0.76 0.117 192)`, 10° apart on the same wheel. A surface resting on it reads as
 * recomputing, so `index.css` keeps every view's stop at least 26° clear of it. A preset card is
 * not a whole view, but it takes `--color-tab` by exactly the same mechanism and spends it on
 * exactly the same surfaces: its edge, its hover bloom, its heading, and the `action-tab` button
 * that loads it. One card in ten looking like it was mid-generation is the same defect at a
 * smaller scale, not a different one.
 */
const RESERVED_STOP = 'cyan';

/**
 * The stops a `--color-tab` may take: the wheel, less the one reserved above.
 *
 * Derived rather than written out, so a stop added to or renamed on the wheel joins the allocation
 * without a second list having to be remembered — and so the exclusion stays a single stated fact
 * rather than the difference between two hand-kept lists.
 *
 * Nine is not worse than ten for the library. What the allocation buys is that neighbouring cards
 * differ and that a card's colour says where it sits, neither of which needs the whole wheel.
 */
const TAB_STOPS = SPECTRUM_STOPS.filter((stop) => stop !== RESERVED_STOP);

/**
 * The stop `index` places round the wheel, as the value to assign to `--color-tab`.
 *
 * Wraps, so a list longer than the pool starts round again rather than running out of colour — the
 * preset library grows with every preset a user saves, and there is no length at which it should
 * stop being coloured.
 *
 * The `?? SPECTRUM_STOPS[0]` is not dead code and not defensive habit: `noUncheckedIndexedAccess`
 * types every computed index as possibly `undefined`, and element 0 of an `as const` tuple is the
 * one access the compiler knows is present. `TAB_STOPS` is a filtered array rather than a tuple, so
 * it offers no such element — the fallback comes from the wheel instead, and `rose` is in both
 * lists, which is what makes it a legal answer here. A non-negative integer is what callers pass
 * and what the modulo assumes; a fractional or negative one lands on that first stop rather than on
 * nothing.
 */
export function spectrumStopAt(index: number): string {
  const stop = TAB_STOPS[index % TAB_STOPS.length] ?? SPECTRUM_STOPS[0];
  return `var(--color-spectrum-${stop})`;
}
