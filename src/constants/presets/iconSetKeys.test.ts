import { describe, expect, it } from 'vitest';
import type { Rgba } from '../../types/quantiser.ts';
import { fromHex } from '../../utils/imageData.ts';
import { keyReaches } from '../../utils/keyReach.ts';
import { BACKGROUND_KEY_COLORS } from '../backgroundKeyColors.ts';
import { CATEGORY_OPTIONS } from '../categories/index.ts';
import { ICON_SET_PRESETS } from './iconSets.ts';

/**
 * That no ICON preset paints with a colour its own background key would cut away (R15 of
 * `docs/todo/icon-catalogue.md`).
 *
 * The Quantise tab removes every pixel within the key's reach wherever it sits (`keyReaches`), so a
 * colour a preset names near its key is a hole in every icon that uses it. **Held where the data
 * exists**: the colours a preset names by hex in its *Primary Colours* and *Accent Colours*, which are
 * the colours the prompt tells the generator to paint with. The catalogue's looks name colours in words
 * and no school colour exists before phase 4, so neither is measurable yet.
 *
 * **A full-bleed preset is held further**, because each square paints a backdrop from the set's colours
 * and lets it fall towards black into its corners and wash a little towards its light. Every step of
 * that series stays out of reach too.
 *
 * **And its key is measured against every colour ICON's fields offer, not only its own.** A reader
 * swaps the colours on a preset more readily than its key, so a full-bleed key has to hold for any
 * colour the *Primary Colours* and *Accent Colours* pools name by hex. Measured over that pool,
 * `PURE_BLACK` reaches the shading of four primaries (Oxblood, Slate, Gunmetal and Midnight Navy, the
 * cyberpunk preset's own Gunmetal among them), `MAGENTA_FF00FF` reaches Void Magenta outright, and
 * `PURE_WHITE` reaches none of them plain or shaded — which is why it is the full-bleed presets' key
 * wherever they have one. The last check below shows the first two failing, so the measurement is
 * known to bite.
 */

const NAMED_HEX = /#[0-9a-f]{6}\b/gi;

/** The colours a preset names by hex, in the two fields that colour its icons. */
function namedColours(subject: (typeof ICON_SET_PRESETS)[number]['subject']): readonly Rgba[] {
  return (
    `${subject.primary_colours} ${subject.accent_colours}`
      .match(NAMED_HEX)
      ?.flatMap((hex) => fromHex(hex) ?? []) ?? []
  );
}

/** `colour` mixed `share` of the way to `towards`, per channel. */
function mix(colour: Rgba, towards: number, share: number): Rgba {
  const channel = (value: number): number => Math.round(value + (towards - value) * share);
  return { r: channel(colour.r), g: channel(colour.g), b: channel(colour.b), a: colour.a };
}

/** The deepest a backdrop is taken to shade a set colour, and the furthest it washes one. */
const DEEPEST_SHADE = 0.95;
const FURTHEST_WASH = 0.25;
const STEPS = 17;

/** The shading and washing series a full-bleed square paints from one set colour. */
function backdropSeries(colour: Rgba): readonly Rgba[] {
  return Array.from({ length: STEPS + 1 }, (_, step) => step / STEPS).flatMap((at) => [
    mix(colour, 0, at * DEEPEST_SHADE),
    mix(colour, 255, at * FURTHEST_WASH),
  ]);
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
    expect(ICON_SET_PRESETS.some((preset) => preset.subject.icons?.look === 'ISOLATED_MARK')).toBe(true);
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

  it('bites on the two coloured-field keys a full-bleed set must not take', () => {
    const { MAGENTA_FF00FF: magenta, PURE_BLACK: black } = BACKGROUND_KEY_COLORS;
    if (magenta === null || black === null) throw new Error('both keys should name a colour');
    expect(poolReachedBy(black)).toEqual([
      'Deep Oxblood #7F1D1D & Bone',
      'Slate #1E293B & Pale Ice',
      'Gunmetal #2B2F36 & Chrome',
      'Midnight Navy #0F172A & Neon Cyan',
    ]);
    expect(poolReachedBy(magenta)).toEqual(['Void Magenta #E879F9']);
  });
});
