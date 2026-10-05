import type { DamageSchool, IconCatalogueEntry, IconKind } from './iconCatalogue.ts';

/**
 * The icons an ICON subject asks for: which catalogue entries and entries of the reader's own, in which
 * order, and how the set is drawn.
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

/**
 * How every icon of the set is coloured (audit finding M1).
 *
 * - `FULL_COLOUR` paints each icon in its own colours and the set's, as the prompt states them.
 * - `TINT_MASK` draws each icon in neutral greys alone, each colour the prompt names drawn as its
 *   lightness, so the engine can multiply a team or faction colour over it at runtime — the one icon
 *   serving every side of a multiplayer match.
 *
 * **Set-wide, like the look**, because a grid mixing masks and coloured icons reads as two packs, and a
 * game tints a whole HUD rather than one marker of it. It reaches the icon sheets through
 * `SheetPlan.tint`, and the background key through `backgroundKeysFor`: a mask's lightest grey is the
 * tint at full strength, close enough to white that the `PURE_WHITE` key would cut it out, so a mask
 * never takes that key.
 *
 * The order is the control's order. A new set takes `DEFAULT_ICON_COLOUR_MODE`.
 */
export const ICON_COLOUR_MODES = ['FULL_COLOUR', 'TINT_MASK'] as const;

export type IconColourMode = (typeof ICON_COLOUR_MODES)[number];

/**
 * An icon the reader writes for their own game — a named quest relic, a faction's signature spell — where
 * the catalogue's archetypes have nothing to tick.
 *
 * **It compiles exactly as a catalogue entry does**: the role opens the inventory line, a spell closes on
 * its school's name and colour, a pair names two drawings, and `id` is the slot and the file name. What
 * differs is the look: one text the reader writes for their own world, rather than one per family, since
 * the reader knows the world their game is set in and the catalogue's families do not.
 *
 * **Every field has passed `checkCustomIcon`**, the one gate a custom entry enters a roster or a
 * project's library through — from the catalogue dialog's form, from storage and from a library pack
 * alike — so a roster never holds one that would throw out of the compiler (R9 of
 * `docs/todo/done/icon-catalogue.md`) or cut two sprites to one file.
 */
export interface CustomIconEntry {
  /**
   * The slot and file name, derived from `role` by `slugify` and unique across every slot name the
   * catalogue, the overlay sheet and the rest of the roster answer to.
   */
  readonly id: string;
  /** The game role as the reader wrote it, whitespace collapsed: it opens the inventory line. */
  readonly role: string;
  /** The shelf it sits at the end of, and what the roster's per-kind counts file it under. */
  readonly kind: IconKind;
  /** Present exactly when `kind` is `SPELL`, as on a catalogue entry. */
  readonly school?: DamageSchool;
  /** Whether the drawing includes a hand, a face or a figure, as on a catalogue entry. */
  readonly figure?: true;
  /** The two states of a toggle, each a slug, as on a catalogue entry. */
  readonly states?: readonly [string, string];
  /** What the icon is drawn as, in the reader's words, completing “Role ×1 — …”. */
  readonly look: string;
}

/** Anything a roster can draw: a catalogue archetype, or an entry of the reader's own. */
export type IconEntry = IconCatalogueEntry | CustomIconEntry;

/**
 * One icon on a roster: a catalogue entry named by its id, or an entry of the reader's own carried
 * whole.
 *
 * **A catalogue pick stores only the id**, so a reworded look reaches every saved set; a custom pick
 * stores the entry itself, so a set keeps the copy it was saved with whatever a project's library
 * (`SavedCustomIcon`) does with its own copy afterwards.
 */
export type IconPick =
  | { readonly source: 'CATALOGUE'; readonly id: string }
  | { readonly source: 'CUSTOM'; readonly entry: CustomIconEntry };

/** The reader's icon set: the look it is drawn in, how it is coloured, and the icons it holds. */
export interface IconRoster {
  readonly look: IconLook;
  readonly colourMode: IconColourMode;
  /**
   * The icons, in the order the sheets draw them, each slot name at most once.
   *
   * The order is the reading order across the series: the first sixteen components are the first icon
   * sheet. An entry with two states is one pick worth two components. It is in shelving order wherever
   * it comes from, with the reader's own entries at the end of their kind's shelves: the store writes it
   * through `sortIconPicks`, `parseIconRoster` sorts what storage and an import hold, and
   * `iconRosterShelving.test.ts` holds the starter roster and every preset to it.
   */
  readonly picks: readonly IconPick[];
}
