/**
 * The vocabulary of the icon catalogue: what an entry is, and the axes it is filed and drawn along.
 *
 * **An entry is an archetype, not a drawing.** "Minor healing consumable" is one game role, and what it
 * looks like is a property of the world the set belongs to: a small red potion in a fantasy set, a
 * stim-pack auto-injector in a cyberpunk one. So an entry names the role once and writes one look per
 * {@link LookFamily}, and the ICON sheet reads the look the subject's *World & Era* maps to — see
 * `constants/iconCatalogue/lookFamilyOfWorld.ts`.
 */

/**
 * What kind of icon a group holds, which is how the catalogue is filed.
 *
 * Coarse on purpose, as `ComponentKind` is: a kind is a shelf a reader browses, and the groups inside
 * it (restoratives, the system panels, map pins) are what a reader actually ticks. Two kinds have
 * content so far; spells and abilities, social icons and companions join in phase 4 of
 * `docs/todo/icon-catalogue.md` with the groups that hold them.
 *
 * A list as well as a union, in the catalogue's shelving order, because the picker walks it: the kind
 * filter offers each, and the roster summary counts each.
 */
export const ICON_KINDS = ['ITEM', 'SYSTEM'] as const;

export type IconKind = (typeof ICON_KINDS)[number];

/**
 * The families of world an entry writes a look for.
 *
 * **Five, and every entry writes all five.** The worlds inside one family differ in mood rather than in
 * what an object *is* — a grim-dark potion and a storybook potion are both a stoppered bottle — and the
 * mood is already section 1's *World & Era* line. What changes between families is the object itself,
 * which is what a look states.
 */
export const LOOK_FAMILIES = ['FANTASY', 'AGE_OF_STEAM', 'MODERN', 'CYBERPUNK', 'SPACE_OPERA'] as const;

export type LookFamily = (typeof LOOK_FAMILIES)[number];

/** One archetype the reader can tick: a game role, and how each family of world draws it. */
export interface IconCatalogueEntry {
  /**
   * The entry's name outside the prompt — its slot in the sheet's manifest and the stem of its file in
   * the sprite pack.
   *
   * Lower-case and hyphen-separated, and unique across the whole catalogue rather than within a group,
   * because a roster mixes groups freely and two picks answering to one name would cut two sprites to
   * one file. Stored in a roster, so renaming one drops it from every saved set.
   */
  readonly id: string;
  /**
   * The game role, in sentence case and with no closing stop — `Minor healing consumable`.
   *
   * It opens the entry's inventory line, so it is what the generator reads before the look, and what a
   * hand-typed world that maps to no family is drawn from.
   */
  readonly role: string;
  /**
   * Whether the drawing includes a hand, a face or a figure.
   *
   * ICON's exclusions forbid a hand or a figure no entry names, so an entry whose subject *is* one — a
   * wave emote, the character panel's bust — says so here, and the catalogue test holds every look
   * mentioning one to declaring it.
   */
  readonly figure?: true;
  /**
   * The two states of a toggle, in the order they are drawn — `['unmuted', 'muted']`.
   *
   * An entry with states is one pick and two components, named `<id>-<state>`, and it never splits
   * across two sheets of a series. Each state is lower-case and hyphen-separated, since it becomes part
   * of a slot name.
   */
  readonly states?: readonly [string, string];
  /**
   * What the role is drawn as in each family of world: a lower-case noun phrase carrying its own
   * article and no closing stop, completing "Minor healing consumable ×1 — …".
   */
  readonly looks: Readonly<Record<LookFamily, string>>;
}

/** One shelf of the catalogue: entries a reader is likely to want together, all of one kind. */
export interface IconCatalogueGroup {
  /** Lower-case and hyphen-separated, unique across the catalogue. */
  readonly id: string;
  /**
   * The shelf's name as the catalogue dialog heads it — `Restoratives`, `Map pins` — in sentence case
   * with no closing stop. It names the Tick all and Untick all buttons beside it as well, so two groups
   * never share one.
   */
  readonly label: string;
  readonly kind: IconKind;
  readonly entries: readonly IconCatalogueEntry[];
}

/**
 * What the catalogue dialog is narrowed to: the words searched for, the kind of shelf shown, and
 * whether only the ticked icons are listed.
 *
 * View state rather than anything stored: the dialog holds it while it is open, and closing it shows
 * the whole catalogue again next time.
 */
export interface IconCatalogueFilter {
  /** Free text; every word must appear in the entry's role, its id, its look or its group's label. */
  readonly query: string;
  /** One kind of shelf, or `ALL`. */
  readonly kind: IconKind | 'ALL';
  readonly tickedOnly: boolean;
}
