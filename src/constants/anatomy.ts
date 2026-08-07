/**
 * The value the additional-anatomy field carries when a subject has none.
 *
 * A sentinel rather than an empty string because the control is a combo box, and an empty first
 * option renders as a blank row. It is also the more honest answer: every *other* cleared field
 * means "you decide", whereas a subject with no tail is stating a fact about itself.
 *
 * The compiler treats it as no anatomy — no components, no inventory entries, and **no line in
 * section 1**, because a bare `NONE` sitting in the highest-weighted section of the prompt is
 * precisely the content-shaped token v2 removed when it deleted the `DEFINED` fallbacks.
 */
export const NO_ADDITIONAL_ANATOMY = 'NONE';

/**
 * The largest count a single named anatomy may ask for.
 *
 * A bound rather than trust, because the field is free text and the number it yields is *allocated*
 * — the atlas preview lays out one cell per component, so an unbounded multiplier turns a typo into
 * a frozen tab, and a large enough one into an `Array.from` that throws during render with no error
 * boundary above it. Ninety-nine is already far past the ~40 components a single generation
 * delivers, so nothing a real sheet asks for is clipped, and a clipped value is visible immediately
 * in the live preview rather than being applied behind the user's back.
 */
export const MAX_ANATOMY_MULTIPLIER = 99;
