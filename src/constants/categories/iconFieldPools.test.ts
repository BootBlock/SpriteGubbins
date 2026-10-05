import { describe, expect, it } from 'vitest';
import type { SubjectFieldKey } from '../../types/subject.ts';
import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import { COLOR_HEX_MAP } from '../colors.ts';
import {
  ACRONYM,
  HEX_COLOUR,
  LETTERING_OBJECTS,
  UNWRITTEN,
  WRITING_SURFACE,
} from '../iconCatalogue/iconLookRules.ts';
import { ICON_OVERLAY_PLANS } from '../sheetPlans/iconOverlaySheet.ts';
import { ICON } from './icon.ts';

/**
 * ICON's option pools, each holding one concern and offering nothing the prompt or another field
 * already states (the options findings of `docs/todo/done/icon-set-audit.md`, phase 2).
 *
 * Each check names the values it was written against, so a pool drifting back fails here rather than in
 * a compiled prompt that contradicts itself.
 */

function pool(key: SubjectFieldKey): readonly string[] {
  return ICON.fields.find((field) => field.key === key)?.options ?? [];
}

/** An *Extra Overlay Pieces* value's piece, without its count: `Tier Pip ×3` is `tier pip`. */
function pieceOf(option: string): string {
  return option.replace(/\s*×\d+$/u, '').toLowerCase();
}

describe('ICON’s option pools', () => {
  it('offers an overlay style for the whole library, and every real piece once, as an extra (O1, O8)', () => {
    const styles = pool('clothing');
    const extras = pool('additional_anatomy').filter((option) => option !== NO_ADDITIONAL_ANATOMY);
    // A style is never one of the pieces a reader adds, and no piece is offered twice.
    expect(styles.filter((style) => extras.some((extra) => pieceOf(extra) === style.toLowerCase()))).toEqual(
      [],
    );
    expect(new Set(extras.map(pieceOf)).size).toBe(extras.length);
    // The library already draws tier marks, a lock, a flare and a crack, so no extra and no style
    // names one of them again.
    const library = /\b(?:tier|pip|padlock|lock(?:ed)?|flare|crack|veil|sweep|cooldown|stack)\b/iu;
    expect([...styles, ...extras].filter((option) => library.test(option))).toEqual([]);
    expect(extras).toContain('Equipped Corner Tick ×1');
    expect(extras).toContain('Quantity Corner Plate ×1');
  });

  it('names no colour in an overlay style, since the overlay sheet draws every piece in the accent colours (O1)', () => {
    // Section 1 colours a piece whose entry names none in the Accent Colours, and in no other colour the
    // list names, so a style that brought a colour of its own (gilded, frost, shadow) would contradict it.
    const colours = Object.keys(COLOR_HEX_MAP).join('|');
    const named = new RegExp(
      String.raw`\b(?:${colours}|gild\w*|gilt|frost\w*|rime|ic[ey]|shadow\w*|ember\w*|blood\w*)\b`,
      'iu',
    );
    expect(pool('clothing').filter((style) => named.test(style))).toEqual([]);
  });

  it('draws every piece of the overlay library in the overlay style (O1)', () => {
    for (const plan of Object.values(ICON_OVERLAY_PLANS)) {
      const roles = plan.groups.flatMap((group) => group.entries.map((entry) => entry.attribute));
      expect(roles.every((bound) => bound?.field === 'clothing' && bound.role === 'DRAWN_IN_IT')).toBe(true);
    }
  });

  it('tells the tier marks apart by shape and pip count, never by colour alone (M2)', () => {
    for (const plan of Object.values(ICON_OVERLAY_PLANS)) {
      const tiers = plan.groups
        .flatMap((group) => group.entries)
        .find((entry) => entry.label === 'tier-mark');
      expect(tiers?.text).toMatch(/a shape of its own carrying one to four pips/u);
      expect(tiers?.text).toMatch(/never by its colour alone/u);
    }
  });

  it('keeps the outline and the light out of Interior Detail, and offers each line technique once (O3, O4)', () => {
    const interior = pool('worn_details');
    expect(
      interior.filter((option) =>
        /\b(?:outline|rim|light(?:ing)?|two-tone|dithered|modelling|painterly)\b/iu.test(option),
      ),
    ).toEqual([]);
    expect(interior.filter((option) => /\bwoodcut\b/iu.test(option))).toEqual([]);
  });

  it('offers nothing that breaks under the isolated-mark look (O7)', () => {
    const framing = [...pool('build'), ...pool('face_head')];
    expect(
      framing.filter((option) => /\b(?:crop\w*|off-centre|wisps?|around the subject)\b/iu.test(option)),
    ).toEqual([]);
  });

  it('offers rarity tiers alone, and a neutral emphasis for a set that mixes them (O9)', () => {
    expect(pool('gender')).toEqual([
      'Neutral, Tier Shown By Overlay Marks',
      'Common',
      'Uncommon',
      'Rare',
      'Epic',
      'Legendary',
    ]);
  });

  it('offers a condition a still can show, and no material, as Condition & Finish (O10)', () => {
    const conditions = pool('age');
    expect(
      conditions.filter((option) => /\b(?:chrome|flicker\w*|glitching|unblemished|glossy)\b/iu.test(option)),
    ).toEqual([]);
    expect(conditions).toContain('Glitch-Sliced & Offset');
  });

  it('states a neon or hologram treatment in one field each, and a subject’s stance only in its framing (O11)', () => {
    const fields: readonly SubjectFieldKey[] = ['face_head', 'worn_details', 'clothing', 'age'];
    const naming = (pattern: RegExp) =>
      fields.filter((key) => pool(key).some((option) => pattern.test(option)));
    expect(naming(/\bneon\b/iu)).toEqual(['clothing']);
    expect(naming(/\bhologra\w*|\bscanline/iu)).toEqual(['face_head']);
    expect(
      pool('silhouette').filter((option) => /\b(?:upright|diagonal|vertical|centred)\b/iu.test(option)),
    ).toEqual([]);
  });

  it('names no object that brings letterforms with it (O13 and C3)', () => {
    const named = ICON.fields.flatMap((field) =>
      field.options.filter((option) => LETTERING_OBJECTS.test(option)),
    );
    expect(named).toEqual([]);
  });

  it('asks for no letters on what every icon is drawn as, held to the catalogue’s own rules (C3)', () => {
    // An option of a field that describes the drawing reaches every icon of the set, so it is held to
    // the rules the catalogue's looks are: no capitalised acronym, which a model letters onto the
    // object (`Moulded Polymer & LED Strip` did), and no writing surface it does not call blank. *Where
    // The Set Is Shown* names the screen the set sits in, never something drawn, and `NONE` is the
    // empty choice of *Extra Overlay Pieces*.
    const lettered = ICON.fields
      .filter((field) => field.key !== 'species')
      .flatMap((field) => field.options.filter((option) => option !== NO_ADDITIONAL_ANATOMY))
      .map((option) => option.replaceAll(HEX_COLOUR, ' '))
      .filter((option) => ACRONYM.test(option) || (WRITING_SURFACE.test(option) && !UNWRITTEN.test(option)));
    expect(lettered).toEqual([]);
    expect(ACRONYM.test('Moulded Polymer & LED Strip')).toBe(true);
  });

  it('offers exclusions the category’s own line does not already state (O6)', () => {
    // Section 7 bans lettering, a slot plate, frame or border, a scene or ground, an unnamed hand or
    // figure, a tooltip or panel, every shadow outside the icon, and motion lines, on every icon sheet.
    const restated =
      /\b(?:letter\w*|numerals?|keybinds?|slot|frame|border|scene|ground|floor|hand|figure|tooltip|panel|shadow|motion)\b/iu;
    expect(pool('exclusions').filter((option) => restated.test(option))).toEqual([]);
  });

  it('offers what a multiplayer cyberpunk HUD needs (M3)', () => {
    expect(pool('species')).toEqual(
      expect.arrayContaining([
        'HUD & Compass',
        'Ping & Emote Wheel',
        'Killfeed & Scoreboard',
        'Cyberware Slots',
        'Quickhack Bar',
        'Lobby & Loadout',
        'Party & Squad Frames',
      ]),
    );
    expect(pool('role')).toEqual(expect.arrayContaining(['16 × 16 Pixels', '20 × 20 Pixels']));
    expect(pool('silhouette')).toContain('Told Apart By Shape, Never By Colour');
    expect(pool('materials')).toContain('Pure Emissive Light, No Material');
    expect(pool('exclusions')).toEqual(
      expect.arrayContaining([
        'No baked team or faction colour',
        'No real-world logo, brand or trademark',
        'No gore, blood or open wound',
        'No two icons told apart by hue alone',
      ]),
    );
    expect(pool('additional_anatomy')).toEqual(
      expect.arrayContaining([
        'Edge-Of-View Pointer ×1',
        'Above & Below Height Arrows ×2',
        'Ping Acknowledged Tick ×1',
        'Hostile Chevron ×1',
      ]),
    );
  });
});
