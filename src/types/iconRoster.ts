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
 * - `FULL_BLEED_TILE` paints each icon as a square edge to edge, its subject and its own backdrop
 *   together, with no frame: the game's interface draws the frame, as an MMORPG's action bar does. The
 *   key colour fills only the gutters between tiles, and each file cut from the sheet is an opaque
 *   square.
 * - `ISOLATED_MARK` draws the subject alone on the key colour, so each file is the subject on
 *   transparency — a map pin, a status badge or a button glyph the interface sets on its own plate.
 *
 * **The look is the set's, not the icon's**, because a grid mixing squares and loose marks reads as two
 * packs. It reaches the icon sheets (`iconSheet`), the overlay sheet (`ICON_OVERLAY_PLANS`), ICON's
 * exclusion and audit text and the wrappers' negatives through `SheetPlan.backdrop`, and ICON's guard
 * through the sheet's `componentClass`.
 *
 * The order is the control's order. Which look a new set takes is `DEFAULT_ICON_LOOK`.
 */
export const ICON_LOOKS = ['FULL_BLEED_TILE', 'ISOLATED_MARK'] as const;

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
