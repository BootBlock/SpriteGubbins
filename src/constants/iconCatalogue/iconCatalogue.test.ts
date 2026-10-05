import { describe, expect, it } from 'vitest';
import { CATEGORY_OPTIONS } from '../categories/index.ts';
import { letteringTermIn } from '../categories/letteringMarks.ts';
import { iconCatalogueRosters } from '../../test/iconCatalogueSubjects.ts';
import { DAMAGE_SCHOOLS, ICON_KINDS, LOOK_FAMILIES } from '../../types/iconCatalogue.ts';
import type { DamageSchool } from '../../types/iconCatalogue.ts';
import { DEFAULT_ICON_LOOK } from './defaultIconLook.ts';
import { ICON_CATALOGUE_GROUPS, iconCatalogueEntry, iconComponentCount } from './index.ts';
import { ICON_ROSTER_CAPACITY, ICON_SERIES_LONGEST, ICONS_PER_SHEET } from './iconSheetLimits.ts';
import {
  ACRONYM,
  FIGURE_WORDS,
  KEY_COLOUR_WORDS,
  LETTERING_OBJECTS,
  NEAR_WHITE_WORDS,
  UNWRITTEN,
  WRITING_SURFACE,
  wordNamed,
  wordWithin,
} from './iconLookRules.ts';
import { LOOK_FAMILY_OF_WORLD, lookFamilyOfWorld } from './lookFamilyOfWorld.ts';
import { BACKGROUND_KEY_COLORS } from '../backgroundKeyColors.ts';
import { fromHex } from '../../utils/imageData.ts';
import { iconPickId } from '../../utils/iconPickId.ts';
import { keyReaches } from '../../utils/keyReach.ts';
import { lookObject } from '../../test/lookObject.ts';
import { ONE_OBJECT_GROUPS, sharedObjects } from '../../test/oneObjectSets.ts';

/**
 * The catalogue's own contract: what every entry has to be for the sheets built from it to be right.
 *
 * An entry's id becomes a slot name and a file in the sprite pack, its role opens an inventory line,
 * and each of its five looks is what a reader in one family of world is sent. The prompt sweeps compile
 * the catalogue in one world, so the rules a look can break on its own are held here, over every look.
 */

const ENTRIES = ICON_CATALOGUE_GROUPS.flatMap((group) => group.entries.map((entry) => ({ group, entry })));

/** Lower-case words joined by single hyphens — safe as a file name on every platform the pack reaches. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const SPELLS = ENTRIES.filter(({ entry }) => entry.school !== undefined);

/** The hue words a look could name, each owned by at most one school. */
const HUE_WORDS = [
  'red',
  'crimson',
  'scarlet',
  'orange',
  'amber',
  'yellow',
  'gold',
  'golden',
  'green',
  'lime',
  'emerald',
  'teal',
  'cyan',
  'turquoise',
  'blue',
  'azure',
  'cobalt',
  'indigo',
  'violet',
  'purple',
  'pink',
  'rose',
] as const;

/**
 * The hues a spell's look may name, by its school: the family of its one colour. A kinetic look names
 * none, since steel grey is a material's colour rather than a hue, and amber is shared by fire and gold
 * because a flame and a holy glow both pass through it.
 */
const SCHOOL_HUES: Readonly<Record<DamageSchool, readonly (typeof HUE_WORDS)[number][]>> = {
  KINETIC: [],
  THERMAL: ['red', 'crimson', 'scarlet', 'orange', 'amber'],
  CRYO: ['cyan', 'turquoise', 'teal'],
  VOLTAIC: ['blue', 'azure', 'cobalt'],
  TOXIC: ['green', 'lime', 'emerald'],
  NEURAL: ['violet', 'purple', 'indigo'],
  NETRUN: ['pink', 'rose'],
  NANITE: ['gold', 'golden', 'amber', 'yellow'],
};

/** How many components an id is, or none for an id the catalogue does not hold. */
function componentsOf(id: string): number {
  const entry = iconCatalogueEntry(id);
  return entry === undefined ? 0 : iconComponentCount(entry);
}

describe('the icon catalogue', () => {
  it('names every entry and every group uniquely, in a spelling a file can carry', () => {
    const ids = ENTRIES.map(({ entry }) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(SLUG);

    const groups = ICON_CATALOGUE_GROUPS.map((group) => group.id);
    expect(new Set(groups).size).toBe(groups.length);
    for (const id of groups) expect(id).toMatch(SLUG);
  });

  it('heads every group with a label of its own, in sentence case', () => {
    // A label names the group's Tick all and Untick all buttons as well as its heading, so two groups
    // sharing one would give two pairs of buttons one accessible name.
    const labels = ICON_CATALOGUE_GROUPS.map((group) => group.label);
    expect(new Set(labels).size).toBe(labels.length);
    for (const label of labels) expect(label).toMatch(/^[A-Z][a-z ]*[a-z]$/);
  });

  it('gives no two-state drawing a slot name another entry already answers to', () => {
    // A pair's drawings are named `<id>-<state>`, so `sound-muted` beside an entry called that would
    // cut two sprites to one file.
    const names = ENTRIES.flatMap(({ entry }) =>
      entry.states === undefined ? [entry.id] : entry.states.map((state) => `${entry.id}-${state}`),
    );
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(ENTRIES.map(({ group, entry }) => [`${group.id} / ${entry.id}`, entry] as const))(
    '%s states its role and five distinct looks the way an inventory line reads them',
    (_where, entry) => {
      expect(entry.role).toMatch(/^[A-Z][^.]*[^.\s]$/);
      expect(entry.role).not.toMatch(/['"]/);

      const looks = LOOK_FAMILIES.map((family) => entry.looks[family]);
      expect(new Set(looks).size).toBe(LOOK_FAMILIES.length);
      for (const look of looks) {
        // Completes "Minor healing consumable ×1 — …": lower case, its own article, no closing stop.
        expect(look).toMatch(/^an? [a-z]/);
        expect(look).not.toMatch(/[.\s]$/);
        // Typographic punctuation only, as all prompt text is.
        expect(look).not.toMatch(/['"]/);
        // Section 0 forbids text on the sheet; a look asking for lettering would be overruled by it.
        expect(letteringTermIn(look), look).toBeUndefined();
        expect(letteringTermIn(entry.role), entry.role).toBeUndefined();
        // Magenta is the background key a sheet opens on, and section 0 forbids drawing any component
        // in it or near it — so a look asking for it would be refused on the default key.
        expect(look, entry.id).not.toMatch(/magenta/i);
        // A hand or a figure survives the exclusions only where the entry names one.
        if (entry.figure !== true) expect(look, entry.id).not.toMatch(FIGURE_WORDS);
      }
    },
  );

  it('draws a toggle as exactly two distinct states, each one a slot-safe word', () => {
    for (const { entry } of ENTRIES) {
      if (entry.states === undefined) continue;
      expect(entry.states, entry.id).toHaveLength(2);
      expect(new Set(entry.states).size, entry.id).toBe(2);
      for (const state of entry.states) expect(state, entry.id).toMatch(SLUG);
    }
  });

  it('shelves the groups kind by kind, in the kinds’ order, with a shelf for every kind', () => {
    // The shelving order is the roster's order, so a group out of place would split a kind's icons
    // across sheets that share nothing else.
    const order = ICON_CATALOGUE_GROUPS.map((group) => ICON_KINDS.indexOf(group.kind));
    expect(order).toEqual([...order].sort((left, right) => left - right));
    expect([...new Set(ICON_CATALOGUE_GROUPS.map((group) => group.kind))]).toEqual([...ICON_KINDS]);
  });

  it('names every entry by a role of its own', () => {
    // The role is a row's checkbox label, so two entries sharing one would be two checkboxes the dialog
    // and a screen reader name alike.
    const roles = ENTRIES.map(({ entry }) => entry.role);
    expect(new Set(roles).size).toBe(roles.length);
  });

  it('gives a school to every spell and ability, and to nothing else', () => {
    for (const { group, entry } of ENTRIES) {
      expect(entry.school !== undefined, `${group.id} / ${entry.id}`).toBe(group.kind === 'SPELL');
    }
  });

  it('shelves every damage school’s attacks, and gives every school some spell', () => {
    for (const school of DAMAGE_SCHOOLS) {
      const spells = ENTRIES.filter(({ entry }) => entry.school === school);
      expect(spells.length, school).toBeGreaterThan(0);
    }
  });

  it.each(SPELLS.map(({ entry }) => [entry.id, entry] as const))(
    '%s names no hue another school owns',
    (_id, entry) => {
      // The line closes on the school's one colour, and the icon sheet ranks a colour an entry names
      // above the set's, so a look naming another school's hue would ask for two leading colours.
      const own = new Set(entry.school === undefined ? [] : SCHOOL_HUES[entry.school]);
      for (const family of LOOK_FAMILIES) {
        const foreign = HUE_WORDS.filter(
          (hue) => !own.has(hue) && new RegExp(`\\b${hue}\\b`, 'i').test(entry.looks[family]),
        );
        expect(foreign, `${entry.id} / ${family}`).toEqual([]);
      }
    },
  );

  it.each(ENTRIES.map(({ entry }) => [entry.id, entry] as const))(
    '%s names nothing that invites lettering onto the icon',
    (_id, entry) => {
      // Section 0 forbids text on the sheet, and a model fills a dial, a gauge or a keypad with
      // numerals, a rune or a sigil with a letterform, an open scroll or a map with writing and a
      // capitalised acronym with its own letters. `letteringTermIn` catches the words that ask for
      // lettering; these are the objects that bring it with them, and the surfaces that do unless the
      // look calls them blank, closed or rolled (audit findings C2 and C3).
      for (const family of LOOK_FAMILIES) {
        const look = entry.looks[family];
        expect(look, `${entry.id} / ${family}`).not.toMatch(LETTERING_OBJECTS);
        expect(look, `${entry.id} / ${family}`).not.toMatch(ACRONYM);
        if (WRITING_SURFACE.test(look)) expect(look, `${entry.id} / ${family}`).toMatch(UNWRITTEN);
      }
    },
  );

  it('names pink only on a netrun entry, whose line pins it clear of the magenta key', () => {
    // Magenta is the default key, and a pink named in words alone ranges into its reach: neon pink is
    // #FF10F0 or #FF6EC7, both of which the keying takes. The netrun school's line names its pink by
    // hex, measured clear of every key in `damageSchools.test.ts`, so its looks may say pink.
    const magenta = BACKGROUND_KEY_COLORS.MAGENTA_FF00FF;
    if (magenta === null) throw new Error('magenta names a colour');
    for (const hex of ['#FF10F0', '#FF6EC7']) expect(keyReaches(magenta, fromHex(hex) ?? magenta)).toBe(true);

    // Anywhere in a word, as this guard always matched, so a run-together `hotpink` is caught too.
    expect(wordWithin('a hotpink glow', KEY_COLOUR_WORDS.MAGENTA_FF00FF)).toBe('pink');
    expect(wordWithin('a neonmagenta rim', KEY_COLOUR_WORDS.MAGENTA_FF00FF)).toBe('magenta');
    for (const { entry } of ENTRIES) {
      if (entry.school === 'NETRUN') continue;
      for (const family of LOOK_FAMILIES) {
        expect(
          wordWithin(entry.looks[family], KEY_COLOUR_WORDS.MAGENTA_FF00FF),
          `${entry.id} / ${family}`,
        ).toBeUndefined();
      }
    }
  });

  it('names no near-white word in a cyberpunk look, since the cyberpunk sets are cut out on a white key', () => {
    // `PURE_WHITE` is the key the full-bleed cyberpunk presets take (`iconSets.ts`), and the keying
    // removes every pixel in its reach wherever it sits, so a white-hot core, white sparks or chrome's
    // mirror highlights would be holes (audit finding C2, which decided the chrome O5 left open).
    for (const { entry } of ENTRIES) {
      expect(wordNamed(entry.looks.CYBERPUNK, KEY_COLOUR_WORDS.PURE_WHITE), entry.id).toBeUndefined();
    }
  });

  it('reads near white as the colours the white key takes, and spares a word that only starts alike', () => {
    // Chrome's highlight, ivory, cream and frost lie inside the white key's reach outright; silver and
    // pearl are close enough that their highlights do.
    const white = BACKGROUND_KEY_COLORS.PURE_WHITE;
    if (white === null) throw new Error('white names a colour');
    for (const hex of ['#E5E7EB', '#FFFFF0', '#FFFDD0', '#E1F5FE']) {
      expect(keyReaches(white, fromHex(hex) ?? white), hex).toBe(true);
    }
    expect(KEY_COLOUR_WORDS.PURE_WHITE).toBe(NEAR_WHITE_WORDS);
    // The cyberpunk looks once named chrome on the white-keyed sets, which this reading catches.
    expect(wordNamed('a pair of chrome defib paddles', NEAR_WHITE_WORDS)).toBe('chrome');
    expect(wordNamed('frosted fins', NEAR_WHITE_WORDS)).toBe('frost');
    expect(wordNamed('a whitish glow', NEAR_WHITE_WORDS)).toBe('white');
    expect(wordNamed('a blackened blade', ['black'])).toBe('black');
    expect(wordNamed('a painter’s palette', NEAR_WHITE_WORDS)).toBeUndefined();
    expect(wordNamed('a paladin’s device', NEAR_WHITE_WORDS)).toBeUndefined();
  });

  it.each(
    ICON_CATALOGUE_GROUPS.filter((group) => !ONE_OBJECT_GROUPS.has(group.id)).map(
      (group) => [group.id, group] as const,
    ),
  )('%s draws no two of its entries as one object in any family', (_id, group) => {
    // A player tells a shelf's icons apart by outline before hue, and a red–green colour-blind player
    // or a grey tint mask by outline alone, so two entries drawn as one object in two colours are one
    // icon to them (audit findings C1 and C2). Tier ladders and marked pairs are `ONE_OBJECT_SETS`.
    for (const family of LOOK_FAMILIES) {
      const shared = sharedObjects(group.entries.map(({ id, looks }) => ({ id, look: looks[family] })));
      expect(shared, family).toEqual([]);
    }
  });

  it('reads the object a look is drawn as', () => {
    // The checks above hold only as far as this reading does, so it is shown on the grammar's cases.
    expect(lookObject('a slim red stim-pack auto-injector, needle capped, with a glowing window')).toBe(
      'injector',
    );
    expect(lookObject('a pair of crossed steel sabres with gold hilts')).toBe('sabre');
    expect(lookObject('a short stack of copper coins with square holes')).toBe('coin');
    expect(lookObject('a bursting green spore pod releasing a ring of pollen')).toBe('pod');
    expect(lookObject('a rolled parchment scroll bound with a black ribbon')).toBe('scroll');
    expect(lookObject('a small round-bellied flask of red potion')).toBe('flask');
    expect(lookObject('a small wrapped parcel tied with string')).toBe('parcel');
    expect(lookObject('a white paw print followed by a line of dots')).toBe('print');
    expect(lookObject('a black folding hunting knife with a hooked blade')).toBe('knife');
    expect(lookObject('a sliding blast door half open, a light bleeding from the gap')).toBe('door');
    expect(lookObject('a green padlock sprung open')).toBe('padlock');
    expect(lookObject('a carved wooden mask painted red with furrowed brows')).toBe('mask');
    expect(lookObject('a small faceted blue energy crystal held in a cell')).toBe('crystal');
    expect(lookObject('a white grav-anchor clamp pulling down with crushing gravity')).toBe('clamp');
    expect(lookObject('a single bed with a white pillow')).toBe('bed');
    expect(lookObject('a single outspread feathered wing in white and gold')).toBe('wing');
  });

  it('outgrows one roster, so the whole catalogue is swept as several', () => {
    // A reader cannot tick every icon into one set: the capacity refuses what does not fit, and the
    // test helpers split the catalogue into as many rosters as it takes, each inside the capacity and
    // between them holding every entry once.
    const components = ENTRIES.reduce((total, { entry }) => total + iconComponentCount(entry), 0);
    expect(components).toBeGreaterThan(ICON_ROSTER_CAPACITY);

    const rosters = iconCatalogueRosters().filter((roster) => roster.look === DEFAULT_ICON_LOOK);
    expect(rosters.length).toBeGreaterThan(1);
    expect(rosters.flatMap((roster) => roster.picks.map(iconPickId))).toEqual(
      ENTRIES.map(({ entry }) => entry.id),
    );
    for (const roster of rosters) {
      const size = roster.picks.reduce((total, pick) => total + componentsOf(iconPickId(pick)), 0);
      expect(size).toBeLessThanOrEqual(ICON_ROSTER_CAPACITY);
    }
  });

  it('shelves what a multiplayer cyberpunk game needs (M5)', () => {
    // Pings and callouts, objectives and zones, killfeed and scoreboard marks, squad roles, cyberware
    // slots, quickhacks, heat and standing, and faction archetypes, each writing all five looks.
    const shelves = new Map(ICON_CATALOGUE_GROUPS.map((group) => [group.id, group.kind]));
    expect(
      Object.fromEntries(
        [
          'pings',
          'objectives',
          'killfeed',
          'squad-roles',
          'cyberware-slots',
          'quickhacks',
          'heat-and-standing',
          'factions',
        ].map((id) => [id, shelves.get(id)]),
      ),
    ).toEqual({
      pings: 'SYSTEM',
      objectives: 'SYSTEM',
      killfeed: 'SYSTEM',
      'squad-roles': 'SYSTEM',
      'cyberware-slots': 'ITEM',
      quickhacks: 'SPELL',
      'heat-and-standing': 'SYSTEM',
      factions: 'SOCIAL',
    });
  });

  it('resolves an id to its entry, and a retired one to nothing', () => {
    const [first] = ENTRIES;
    if (first === undefined) throw new Error('The catalogue is empty');
    expect(iconCatalogueEntry(first.entry.id)).toBe(first.entry);
    expect(iconCatalogueEntry('retired-entry')).toBeUndefined();
  });
});

describe('the look family a world draws from', () => {
  const worlds = CATEGORY_OPTIONS.ICON.fields.find((field) => field.key === 'setting')?.options ?? [];

  it('maps every World & Era option, and maps nothing the pool does not offer', () => {
    expect(worlds.length).toBeGreaterThan(0);
    expect([...Object.keys(LOOK_FAMILY_OF_WORLD)].sort()).toEqual([...worlds].sort());
  });

  it('reaches every family from some world', () => {
    const reached = new Set(Object.values(LOOK_FAMILY_OF_WORLD));
    expect([...reached].sort()).toEqual([...LOOK_FAMILIES].sort());
  });

  it('reads a world however it is cased and spaced, and names no family for one it does not know', () => {
    expect(lookFamilyOfWorld('Near-Future Cyberpunk')).toBe('CYBERPUNK');
    expect(lookFamilyOfWorld('  near-future cyberpunk ')).toBe('CYBERPUNK');
    expect(lookFamilyOfWorld('Dieselpunk Sky Pirates')).toBeNull();
    expect(lookFamilyOfWorld('')).toBeNull();
  });
});

describe('the icon sheet limits', () => {
  it('draws a square grid, and bounds the series a full roster can take', () => {
    expect(ICONS_PER_SHEET).toBe(16);
    // Twenty-two icon sheets, then the overlay sheet: a cut that fills each sheet holds at least fifteen
    // on every one but the last, because a two-state entry that would straddle a boundary opens the next
    // sheet instead, and the even cut the series makes takes no more sheets than that.
    expect(ICON_SERIES_LONGEST).toBe(23);
  });
});

describe('the starter roster', () => {
  it('fills exactly one icon sheet from entries the catalogue holds', () => {
    const roster = CATEGORY_OPTIONS.ICON.iconRoster;
    if (roster === undefined) throw new Error('ICON declares no starter roster');
    // The look of the action bar the catalogue was built for — see `DEFAULT_ICON_LOOK`.
    expect(roster.look).toBe('FULL_BLEED_TILE');
    const ids = roster.picks.map(iconPickId);
    expect(new Set(ids).size).toBe(ids.length);

    const entries = ids.flatMap((id) => iconCatalogueEntry(id) ?? []);
    expect(entries).toHaveLength(roster.picks.length);
    const components = entries.reduce((total, entry) => total + iconComponentCount(entry), 0);
    expect(components).toBe(ICONS_PER_SHEET);
  });

  it('is declared by ICON alone', () => {
    const declaring = Object.entries(CATEGORY_OPTIONS)
      .filter(([, definition]) => definition.iconRoster !== undefined)
      .map(([category]) => category);
    expect(declaring).toEqual(['ICON']);
  });
});
