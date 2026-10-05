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
 * it (restoratives, the thermal attacks, mounts) are what a reader actually ticks.
 *
 * - `ITEM`: things a character carries and uses up.
 * - `SPELL`: the abilities a spellbook and an action bar hold, every one in a {@link DamageSchool}.
 * - `SOCIAL`: emotes, the chat channels and the faction emblems a player sides with.
 * - `COMPANION`: mounts, pets and the commands a pet bar gives.
 * - `PROFESSION`: the crafting and gathering trades. A sixth kind beside the plan's five, because a
 *   trade is neither a companion nor a spell, and filing it under either would put a mining pick on
 *   the shelf a reader opens for a mount or a fireball.
 * - `SYSTEM`: the panels, markers and status icons a game's interface draws.
 *
 * A list as well as a union, in the catalogue's shelving order, because the picker walks it: the kind
 * filter offers each, and the roster summary counts each.
 */
export const ICON_KINDS = ['ITEM', 'SPELL', 'SOCIAL', 'COMPANION', 'PROFESSION', 'SYSTEM'] as const;

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

/**
 * The damage schools a spell or ability belongs to, under the names a cyberpunk world gives them.
 *
 * **Each school is one colour across the whole set**, so a player knows every thermal ability by the
 * glow it shares with the others before reading its silhouette — the convention a World of Warcraft
 * spellbook teaches. The colour and the school's name in each family of world are
 * `DAMAGE_SCHOOL_DEFINITIONS` in `constants/iconCatalogue/damageSchools.ts`.
 *
 * In fantasy they are physical, fire, frost, storm, nature, shadow, arcane and holy. The order is the
 * school filter's order and the attack shelves'.
 */
export const DAMAGE_SCHOOLS = [
  'KINETIC',
  'THERMAL',
  'CRYO',
  'VOLTAIC',
  'TOXIC',
  'NEURAL',
  'NETRUN',
  'NANITE',
] as const;

export type DamageSchool = (typeof DAMAGE_SCHOOLS)[number];

/** What a damage school is called, and the one colour every icon of it is led by. */
export interface DamageSchoolDefinition {
  /** The school's name in the catalogue — `Thermal` — in sentence case: what the picker files it under. */
  readonly label: string;
  /**
   * What each family of world calls the school, lower case and completing “… — fire school” in an
   * inventory line. A world that maps to no family is told the catalogue's own name, `label`.
   */
  readonly names: Readonly<Record<LookFamily, string>>;
  /** The colour in words, lower case — `orange` — said before its hex so a model reads the hue first. */
  readonly colourName: string;
  /** The colour as six-digit hex, `#F97316`: what the prompt names and the key tests measure. */
  readonly hex: string;
}

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
   * The damage school a spell or ability belongs to: present on every entry of a `SPELL` group and on
   * no other, which the catalogue test holds.
   *
   * It is what the inventory line closes on — the school's name in the subject's world and its colour
   * by hex — so the generator leads the icon with the school's colour (`iconLookText`).
   */
  readonly school?: DamageSchool;
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
 * What the catalogue dialog is narrowed to: the words searched for, the kind of shelf shown, the damage
 * school, and whether only the ticked icons are listed.
 *
 * View state rather than anything stored: the dialog holds it while it is open, and closing it shows
 * the whole catalogue again next time.
 */
export interface IconCatalogueFilter {
  /** Free text; every word must appear in the entry's role, its id, its look or its group's label. */
  readonly query: string;
  /** One kind of shelf, or `ALL`. */
  readonly kind: IconKind | 'ALL';
  /**
   * One damage school, or `ALL`. Offered only while `kind` is `SPELL`, the one kind whose entries carry
   * a school, and set back to `ALL` whenever the kind moves off it, so a school chosen earlier never
   * hides rows the reader cannot see a control for.
   */
  readonly school: DamageSchool | 'ALL';
  readonly tickedOnly: boolean;
}
