/**
 * The character budget every `SelectField` option label is written to, and what it costs in pixels.
 *
 * A native `<select>` renders its selected option in a box sized by its container: it cannot wrap,
 * shrink or abbreviate, so an option longer than the control is truncated with the user agent's own
 * ellipsis — and what disappears is the *end* of the label, which in this app is the parenthetical
 * telling a first-time user which option is the standard one. Twelve options across seven studio
 * selects shipped that way.
 *
 * Two tests read this, which is why it is a module of its own rather than a constant inside one of
 * them. `select-option-labels.test.ts` holds the labels to the budget; `studio-column-width.test.ts`
 * holds the *layout* to it. Neither half is worth anything alone — a budget nothing is measured
 * against is a comment, and a column sized for a budget nobody writes to is a coincidence.
 */

/**
 * 50 characters.
 *
 * A count rather than a width because the control is `font-mono`, where the two are the same
 * measurement. It is the length of the longest label that already fitted before this was enforced —
 * `DETAILED_PRODUCTION (seams and material divisions)` — and shortening the other twelve to it cost
 * only parenthetical wording, where 49 would have started costing identifiers. The identifiers
 * cannot move: they are the terms the compiled prompt is written against.
 *
 * **The budget is the anchor and the layout follows it, not the other way round.** Deriving it from
 * whatever width the studio's column happens to settle at says nothing about the widths that column
 * passes through on the way, which is exactly how the two-column split came to engage 16px before a
 * label could render whole in it.
 */
export const LABEL_BUDGET = 50;

/** `font-mono` at `text-xs` (13px) advances 8px per character. Measured in Edge. */
const MONO_ADVANCE_PX = 8;

/**
 * What the control keeps back before any text: 1px of border and 10px of `p-2.5` padding either
 * side, plus the 20px the user agent reserves for the dropdown arrow.
 */
const SELECT_CHROME_PX = 42;

/**
 * 442px — the narrowest a `SelectField` may be laid out and still render a budgeted label whole.
 * Confirmed against the browser's own intrinsic width for a 50-character option, which is 442.0px.
 */
export const SELECT_MIN_PX = LABEL_BUDGET * MONO_ADVANCE_PX + SELECT_CHROME_PX;
