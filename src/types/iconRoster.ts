/**
 * The icons an ICON subject asks for: which catalogue entries, in which order, and how the set is drawn.
 *
 * It lives on the subject (`SubjectDefinition.icons`) rather than on the output configuration because it
 * is *what* is drawn — the inventory — and it travels wherever a subject does: the session, the studio
 * history, a saved preset and the library pack, all inside `subject_json`.
 */

/**
 * How every icon of the set is drawn.
 *
 * **One look so far, and the union grows.** `ISOLATED_MARK` is the subject alone on the key colour,
 * which is what an icon sheet has always drawn. The full-bleed tile — the art filling the whole square,
 * backdrop included — is phase 3 of `docs/todo/icon-catalogue.md`, and it joins this list in the change
 * that teaches the sheet to draw it, so no stored roster can name a look the prompt does not state.
 */
export const ICON_LOOKS = ['ISOLATED_MARK'] as const;

export type IconLook = (typeof ICON_LOOKS)[number];

/** The reader's icon set: the look it is drawn in, and the catalogue entries it holds. */
export interface IconRoster {
  readonly look: IconLook;
  /**
   * Catalogue entry ids, in the order the sheets draw them, each at most once.
   *
   * The order is the reading order across the series: the first sixteen components are the first icon
   * sheet. An entry with two states is one pick worth two components.
   */
  readonly picks: readonly string[];
}
