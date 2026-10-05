import { describe, expect, it } from 'vitest';
import type { Rgba } from '../../types/quantiser.ts';
import { backdropSeries } from '../../test/backdropSeries.ts';
import { DAMAGE_SCHOOLS } from '../../types/iconCatalogue.ts';
import { fromHex } from '../../utils/imageData.ts';
import { keyReaches } from '../../utils/keyReach.ts';
import { BACKGROUND_KEY_COLORS } from '../backgroundKeyColors.ts';
import { DAMAGE_SCHOOL_DEFINITIONS } from '../iconCatalogue/damageSchools.ts';
import { iconCatalogueEntry } from '../iconCatalogue/index.ts';
import { KEY_COLOUR_WORDS, wordWithin } from '../iconCatalogue/iconLookRules.ts';
import { lookFamilyOfWorld } from '../iconCatalogue/lookFamilyOfWorld.ts';
import { iconPickId } from '../../utils/iconPickId.ts';
import { ICON_SET_PRESETS } from './iconSets.ts';
import { PRESETS } from './index.ts';
import { backgroundKeysFor, resolveBackgroundKey } from '../backgroundKeysFor.ts';
import { CATEGORY_OPTIONS, defaultSubjectFor } from '../categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../output/index.ts';

/**
 * That no ICON preset paints with a colour its own background key would cut away (R15 of
 * `docs/todo/done/icon-catalogue.md`).
 *
 * The Quantise tab removes every pixel within the key's reach wherever it sits (`keyReaches`), so a
 * colour a preset names near its key is a hole in every icon that uses it. **Held where the data
 * exists**: the colours a preset names by hex in its *Primary Colours* and *Accent Colours*, which are
 * the colours the prompt tells the generator to paint with. The catalogue's looks name colours in words,
 * so they are not measurable; the damage schools' colours are, and `damageSchools.test.ts` holds them
 * against every key along the same backdrop series.
 *
 * **A full-bleed preset is held further**, because each square paints a backdrop from the set's colours
 * and lets it fall towards black into its corners and wash a little towards its light. Every step of
 * that series (`backdropSeries`) stays out of reach too.
 *
 * **And its key is measured against every colour ICON's fields offer, not only its own.** A reader
 * swaps the colours on a preset more readily than its key, so a full-bleed key has to hold for any
 * colour the *Primary Colours* and *Accent Colours* pools name by hex. Measured over that pool,
 * `PURE_BLACK` reaches the shading of four primaries (Oxblood, Slate, Gunmetal and Midnight Navy, the
 * cyberpunk preset's own Gunmetal among them), and `PURE_WHITE` reaches none of them plain or shaded —
 * which is why it is the full-bleed presets' key wherever they have one. A check below shows the black
 * key failing, so the measurement is known to bite. `MAGENTA_FF00FF` used to reach Void Magenta
 * outright; the suites after this one hold every pool to the default key, and every near-white word to
 * a hex these measurements can read.
 */

const NAMED_HEX = /#[0-9a-f]{6}\b/gi;

/** The slot names a preset's roster ticks — every one a catalogue id, since a preset ships no custom entry. */
function pickIds(preset: (typeof ICON_SET_PRESETS)[number]): readonly string[] {
  return (preset.subject.icons?.picks ?? []).map(iconPickId);
}

/** The colours a preset names by hex, in the two fields that colour its icons. */
function namedColours(subject: (typeof ICON_SET_PRESETS)[number]['subject']): readonly Rgba[] {
  return (
    `${subject.primary_colours} ${subject.accent_colours}`
      .match(NAMED_HEX)
      ?.flatMap((hex) => fromHex(hex) ?? []) ?? []
  );
}

/** Every option of ICON's two colour fields that names a hex whose backdrop series `key` reaches. */
function poolReachedBy(key: Rgba): readonly string[] {
  return CATEGORY_OPTIONS.ICON.fields
    .filter((field) => field.key === 'primary_colours' || field.key === 'accent_colours')
    .flatMap((field) => field.options)
    .filter((option) =>
      (option.match(NAMED_HEX) ?? [])
        .flatMap((hex) => fromHex(hex) ?? [])
        .flatMap(backdropSeries)
        .some((colour) => keyReaches(key, colour)),
    );
}

describe('the ICON presets’ background keys', () => {
  it.each(ICON_SET_PRESETS.map((preset) => [preset.name, preset] as const))(
    '%s names no colour its key cuts away',
    (_name, preset) => {
      const key = BACKGROUND_KEY_COLORS[preset.output.backgroundKey];
      if (key === null) return;
      for (const colour of namedColours(preset.subject)) expect(keyReaches(key, colour)).toBe(false);
    },
  );

  const fullBleed = ICON_SET_PRESETS.filter((preset) => preset.subject.icons?.look === 'FULL_BLEED_TILE');

  it('has a full-bleed preset to hold, and keeps an isolated one', () => {
    expect(fullBleed.map((preset) => preset.id)).toContain('cyberpunk-action-bar-consumables');
    expect(fullBleed.map((preset) => preset.id)).toContain('cyberpunk-spellbook-combat-abilities');
    expect(ICON_SET_PRESETS.some((preset) => preset.subject.icons?.look === 'ISOLATED_MARK')).toBe(true);
  });

  it.each(ICON_SET_PRESETS.map((preset) => [preset.name, preset] as const))(
    '%s shades none of its spells’ school colours into its key',
    (_name, preset) => {
      // A spell's line names its school's colour, and the icon sheet ranks it above the set's own, so
      // the key has to hold for it as it does for the set's colours — along the backdrop series on a
      // full-bleed set, where the school's glow lights the square's backdrop too.
      const key = BACKGROUND_KEY_COLORS[preset.output.backgroundKey];
      if (key === null) return;
      const schools = pickIds(preset).flatMap((id) => iconCatalogueEntry(id)?.school ?? []);
      for (const school of schools) {
        const colour = fromHex(DAMAGE_SCHOOL_DEFINITIONS[school].hex);
        if (colour === null) throw new Error(`${school} names no colour`);
        const steps = preset.subject.icons?.look === 'FULL_BLEED_TILE' ? backdropSeries(colour) : [colour];
        for (const step of steps) expect(keyReaches(key, step), school).toBe(false);
      }
    },
  );

  it.each(ICON_SET_PRESETS.map((preset) => [preset.name, preset] as const))(
    '%s draws no pick in the colour its key names',
    (_name, preset) => {
      // Section 0 forbids drawing anything in or near the key colour, and the keying takes it out of
      // every square it lands in, so a look naming the key's colour — white sparks on a white key —
      // asks for a hole.
      const words = KEY_COLOUR_WORDS[preset.output.backgroundKey];
      const family = lookFamilyOfWorld(preset.subject.setting);
      if (family === null) throw new Error(`${preset.name} names a world no family draws`);
      for (const id of pickIds(preset)) {
        const entry = iconCatalogueEntry(id);
        if (entry === undefined) throw new Error(`${preset.name} picks ${id}, which the catalogue lacks`);
        expect(wordWithin(entry.looks[family], words), id).toBeUndefined();
      }
    },
  );

  it('measures every school’s colour against the spellbook’s key', () => {
    const spellbook = ICON_SET_PRESETS.find((preset) => preset.id === 'cyberpunk-spellbook-combat-abilities');
    const schools = new Set(
      (spellbook === undefined ? [] : pickIds(spellbook)).flatMap(
        (id) => iconCatalogueEntry(id)?.school ?? [],
      ),
    );
    expect([...schools].sort()).toEqual([...DAMAGE_SCHOOLS].sort());
  });

  it.each(fullBleed.map((preset) => [preset.name, preset] as const))(
    '%s shades no backdrop into its key',
    (_name, preset) => {
      const key = BACKGROUND_KEY_COLORS[preset.output.backgroundKey];
      if (key === null) return;
      const colours = namedColours(preset.subject);
      expect(colours.length).toBeGreaterThan(0);
      for (const colour of colours.flatMap(backdropSeries)) expect(keyReaches(key, colour)).toBe(false);
    },
  );

  it.each(fullBleed.map((preset) => [preset.name, preset] as const))(
    '%s takes a key no colour ICON offers is shaded into',
    (_name, preset) => {
      const key = BACKGROUND_KEY_COLORS[preset.output.backgroundKey];
      if (key === null) return;
      expect(poolReachedBy(key)).toEqual([]);
    },
  );

  it('bites on the black key, which a full-bleed set must not take', () => {
    const { PURE_BLACK: black } = BACKGROUND_KEY_COLORS;
    if (black === null) throw new Error('the black key should name a colour');
    expect(poolReachedBy(black)).toEqual([
      'Deep Oxblood #7F1D1D & Bone #D9D4C7',
      'Slate #1E293B & Pale Ice #BFD7E6',
      'Gunmetal #2B2F36 & Brushed Steel #A8B0BA',
      'Midnight Navy #0F172A & Neon Cyan',
    ]);
  });
});

/**
 * The default key against every colour any category offers (audit finding O5).
 *
 * A fresh subject is drawn on `DEFAULT_OUTPUT_CONFIG`'s key, so a pooled colour that key reaches is a
 * hole in every component painted with it, on a set nobody has configured yet. `Void Magenta #E879F9`
 * was that colour on ICON and FONT, and as `Reward Magenta` and `Neon Magenta` on INTERFACE and
 * BACKGROUND, where the cyberpunk parallax preset painted with it on the magenta key it never changed.
 */
describe('the default background key', () => {
  const key = BACKGROUND_KEY_COLORS[DEFAULT_OUTPUT_CONFIG.backgroundKey];

  it('reaches no colour any category’s pools name by hex', () => {
    if (key === null) throw new Error('the default key should name a colour');
    const reached = Object.entries(CATEGORY_OPTIONS).flatMap(([category, definition]) =>
      definition.fields.flatMap((field) =>
        field.options
          .filter((option) =>
            (option.match(NAMED_HEX) ?? []).some((hex) => {
              const colour = fromHex(hex);
              return colour !== null && keyReaches(key, colour);
            }),
          )
          .map((option) => `${category}.${field.key}: ${option}`),
      ),
    );
    expect(reached).toEqual([]);
  });

  it('shades no colour ICON offers into itself, so a fresh full-bleed set is safe on it', () => {
    // A fresh ICON subject is a full-bleed set on this key, so its backdrops are held as the presets'
    // are, along the whole backdrop series.
    if (key === null) throw new Error('the default key should name a colour');
    expect(defaultSubjectFor('ICON').icons?.look).toBe('FULL_BLEED_TILE');
    expect(poolReachedBy(key)).toEqual([]);
  });

  it('bites on the colour the pools used to offer', () => {
    const retired = fromHex('#E879F9');
    if (key === null || retired === null) throw new Error('both should name a colour');
    expect(keyReaches(key, retired)).toBe(true);
  });
});

/**
 * The near-white words, which no hex pins (audit finding O2).
 *
 * A full-bleed set takes `PURE_WHITE`, and a colour named only in words — `Chrome`, `Bone White`,
 * `Pale Ice` — is never measured against it, so the pools' measurements above say nothing about the
 * colours most likely to be keyed out. **Every near-white word in ICON's two colour pools therefore names
 * its hex**, which is what puts it inside `poolReachedBy`'s measurement, and a preset on the white key
 * names no near-white word without one in any field: chrome's mirror highlights reach white whatever the
 * set's own colours are. The catalogue's looks name colours in words too, and are held to the white key
 * by `KEY_COLOUR_WORDS`; whether a look's chrome belongs on a white-keyed preset is the catalogue's own
 * audit (C2), not this one.
 */
const NEAR_WHITE = /\b(?:white|chrome|bone|ivory|pearl|silver|snow|cream|pale|bleached|ice)\b/i;

/** Each part of a value that names a near-white word and no hex, split where a value names two colours. */
function unhexedNearWhite(value: string): readonly string[] {
  return value
    .split(/[&,]/)
    .map((part) => part.trim())
    .filter((part) => NEAR_WHITE.test(part) && part.match(NAMED_HEX) === null);
}

describe('the near-white words', () => {
  it('name their hex wherever ICON’s two colour pools offer one', () => {
    const unhexed = CATEGORY_OPTIONS.ICON.fields
      .filter((field) => field.key === 'primary_colours' || field.key === 'accent_colours')
      .flatMap((field) => field.options.flatMap(unhexedNearWhite));
    expect(unhexed).toEqual([]);
  });

  it.each(
    ICON_SET_PRESETS.filter((preset) => preset.output.backgroundKey === 'PURE_WHITE').map(
      (preset) => [preset.name, preset] as const,
    ),
  )('%s, on the white key, names no near-white word without its hex', (_name, preset) => {
    const unhexed = CATEGORY_OPTIONS.ICON.fields.flatMap((field) =>
      unhexedNearWhite(preset.subject[field.key]),
    );
    expect(unhexed).toEqual([]);
  });

  it('bites on the values the white-keyed presets used to name', () => {
    expect(unhexedNearWhite('Gunmetal #2B2F36 & Chrome')).toEqual(['Chrome']);
    expect(unhexedNearWhite('Scratched Chrome & Rubber Grip')).toEqual(['Scratched Chrome']);
    expect(unhexedNearWhite('Matte Black & Bone White')).toEqual(['Bone White']);
  });
});

/**
 * A tint mask's key (audit finding M1): its lightest grey is the tint at full strength, close enough to
 * white for the white key to cut it out, so no preset pairs the two and `resolveBackgroundKey` moves a
 * stored white key off a mask wherever the two meet.
 */
describe('a tint mask’s background key', () => {
  it.each(PRESETS.map((preset) => [preset.name, preset] as const))(
    '%s takes a key its own subject is offered',
    (_name, preset) => {
      expect(backgroundKeysFor(preset.subject)).toContain(preset.output.backgroundKey);
    },
  );

  it('ships a tint mask, and withholds the white key from it alone', () => {
    const masks = ICON_SET_PRESETS.filter((preset) => preset.subject.icons?.colourMode === 'TINT_MASK');
    expect(masks.map((preset) => preset.id)).toContain('cyberpunk-squad-hud-markers');
    for (const mask of masks) {
      expect(backgroundKeysFor(mask.subject)).not.toContain('PURE_WHITE');
      expect(resolveBackgroundKey(mask.subject, 'PURE_WHITE')).toBe('MAGENTA_FF00FF');
    }
    expect(backgroundKeysFor(defaultSubjectFor('ICON'))).toContain('PURE_WHITE');
  });
});
