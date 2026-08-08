import { describe, expect, it } from 'vitest';
import { PALETTE_IDS } from '../../types/palette.ts';
import type { Palette } from '../../types/palette.ts';
import { channelLevels } from '../../utils/channelLevels.ts';
import { fromHex, toHex } from '../../utils/imageData.ts';
import { PALETTE_CHOICES, PALETTES, paletteFor } from './index.ts';

/**
 * The palette library's own contract.
 *
 * Several hundred hex literals transcribed by hand from published sources are exactly the kind
 * of data that goes wrong quietly: a five-digit entry renders as no swatch and quantises to nothing,
 * a duplicate silently shrinks a palette by one, and a lower-case entry compares unequal to
 * everything `toHex` produces. None of that fails anywhere else in the app, so it fails here.
 *
 * The counts are checked for *coherence* rather than against a second list of the right answers —
 * a test that restated "the NES has 55" would be a second place to be wrong about the NES.
 */

/**
 * Words that would mean a note has wandered into the hardware profile's half.
 *
 * The mirror of `hardware.test.ts`'s colour grep, and it exists because the asymmetry was real: that
 * one was written and this one was not, so the C64 note ended up stating its pixel aspect, and a Mega
 * Drive profile carrying that palette emitted two contradictory pixel shapes into one section of the
 * prompt. The division of labour only holds if it is checked in both directions.
 *
 * A dimension in a note is *not* what this looks for — the Spectrum's 8 × 8 attribute cell and the
 * NES's 16 × 16 attribute area are rules about where colour may change, which is colour. What a note
 * may not describe is the shape or size of the display itself.
 */
const GEOMETRY_WORDS = /\bwider?\b|\btall(er)?\b|\bresolutions?\b/i;

/** Every palette that is not `FREE`, which is the only id with no definition. */
const DEFINED: readonly Palette[] = PALETTE_IDS.map((id) => PALETTES[id]).filter(
  (palette): palette is Palette => palette !== null,
);

describe('the palette library', () => {
  it('defines every id except FREE, and FREE alone', () => {
    expect(paletteFor('FREE')).toBeNull();
    expect(DEFINED).toHaveLength(PALETTE_IDS.length - 1);
  });

  it.each(DEFINED)('$id carries its own id, so a lookup cannot return a mislabelled palette', (palette) => {
    expect(PALETTES[palette.id]).toBe(palette);
  });

  it('offers exactly one choice per id, in the union’s order', () => {
    // The dropdown is derived from the map, and this is what that buys: a palette cannot be added
    // without appearing, and a choice cannot outlive the palette it names.
    expect(PALETTE_CHOICES.map((choice) => choice.value)).toEqual([...PALETTE_IDS]);
  });

  it.each(DEFINED)('$id names itself in prose the prompt can use', (palette) => {
    // `name` is interpolated mid-sentence — "a colour the Sega Mega Drive could actually show" — so
    // the stored identifier reaching it would read as a substitution that failed. `PICO-8` and
    // `(NTSC)` are why this looks for the identifier itself rather than for upper case.
    expect(palette.name).not.toContain('_');
    expect(palette.name).not.toBe(palette.id);
    expect(palette.name.trim()).toBe(palette.name);
    expect(palette.note).not.toBe('');
  });

  it.each(DEFINED)('$id says nothing about geometry, which is the profile’s half', (palette) => {
    expect(
      GEOMETRY_WORDS.test(palette.note),
      `${palette.id}'s note describes the display's shape or size; that belongs to its hardware profile, ` +
        `which states it — saying it in both is how one prompt ends up with two pixel aspects`,
    ).toBe(false);
  });
});

describe('a fixed palette’s entries', () => {
  const fixed = DEFINED.filter((palette) => palette.space.kind === 'FIXED');

  it('is not empty — a machine with a list has to have one', () => {
    expect(fixed.length).toBeGreaterThan(0);
  });

  it.each(fixed)('$id is written as upper-case #RRGGBB throughout', (palette) => {
    if (palette.space.kind !== 'FIXED') return;
    const malformed = palette.space.entries.filter((entry) => !/^#[0-9A-F]{6}$/.test(entry));
    expect(malformed).toEqual([]);
  });

  it.each(fixed)('$id round-trips every entry through the quantiser’s own reader', (palette) => {
    if (palette.space.kind !== 'FIXED') return;
    // The property that actually matters downstream: `colorReductionFor` maps these through
    // `fromHex`, and an entry it cannot read is dropped from the palette without a word.
    for (const entry of palette.space.entries) {
      const color = fromHex(entry);
      expect(color, `${palette.id} cannot read ${entry}`).not.toBeNull();
      if (color !== null) expect(toHex(color)).toBe(entry);
    }
  });

  it.each(fixed)('$id lists no colour twice', (palette) => {
    if (palette.space.kind !== 'FIXED') return;
    expect(new Set(palette.space.entries).size).toBe(palette.space.entries.length);
  });

  it.each(fixed)('$id cannot show more colours at once than it has', (palette) => {
    if (palette.space.kind !== 'FIXED' || palette.onScreenColors === null) return;
    expect(palette.onScreenColors).toBeLessThanOrEqual(palette.space.entries.length);
  });
});

describe('a channel-depth palette', () => {
  const spaces = DEFINED.filter((palette) => palette.space.kind === 'CHANNEL_DEPTH');

  it('is not empty — half the library’s machines have no list at all', () => {
    expect(spaces.length).toBeGreaterThan(0);
  });

  it.each(spaces)('$id states a depth the ladder can be built from', (palette) => {
    if (palette.space.kind !== 'CHANNEL_DEPTH') return;
    // Two through six is what the shipped machines span, and the bound is what stops a typo'd 30
    // reaching `Array.from({ length: 2 ** 30 })` in the prompt text.
    expect(palette.space.bitsPerChannel).toBeGreaterThanOrEqual(2);
    expect(palette.space.bitsPerChannel).toBeLessThanOrEqual(8);
    expect(channelLevels(palette.space.bitsPerChannel)).toHaveLength(2 ** palette.space.bitsPerChannel);
  });
});

describe('every palette’s two colour limits', () => {
  it.each(DEFINED)('$id never lets one component carry more than the whole sheet', (palette) => {
    // The one way the pair can contradict each other, and it would read as nonsense in the prompt:
    // "no more than 4 colours across the sheet" followed by "no component carries more than 15".
    if (palette.onScreenColors === null || palette.colorsPerComponent === null) return;
    expect(palette.colorsPerComponent).toBeLessThanOrEqual(palette.onScreenColors);
  });

  it.each(DEFINED)('$id states positive counts where it states any', (palette) => {
    for (const count of [palette.onScreenColors, palette.colorsPerComponent]) {
      if (count !== null) expect(count).toBeGreaterThan(0);
    }
  });
});
