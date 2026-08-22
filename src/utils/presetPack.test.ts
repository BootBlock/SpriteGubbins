import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_PRESET, PRESETS } from '../constants/presets/index.ts';
import type { PresetArchetype } from '../types/preset.ts';
import { parsePresetPack, serialisePresetPack } from './presetPack.ts';

function customPreset(overrides: Partial<PresetArchetype> = {}): PresetArchetype {
  return {
    id: 'custom-1',
    name: 'My Knight',
    description: 'A knight of my own.',
    category: 'CHARACTER',
    subject: defaultSubjectFor('CHARACTER'),
    output: DEFAULT_PRESET.output,
    isCustom: true,
    ...overrides,
  };
}

describe('serialisePresetPack', () => {
  it('includes the built-ins, so the file is readable on its own', () => {
    const parsed: unknown = JSON.parse(serialisePresetPack([customPreset()]));
    expect(Array.isArray(parsed) && parsed).toHaveLength(PRESETS.length + 1);
  });

  it('is valid JSON with no custom presets', () => {
    expect(JSON.parse(serialisePresetPack([]))).toHaveLength(PRESETS.length);
  });
});

describe('parsePresetPack', () => {
  it('returns the custom presets in a pack', () => {
    const text = JSON.stringify([customPreset({ id: 'custom-a', name: 'A' })]);
    expect(parsePresetPack(text)?.map((preset) => preset.name)).toEqual(['A']);
  });

  it('drops entries it cannot vouch for and keeps the rest', () => {
    const text = JSON.stringify([customPreset({ id: 'custom-good', name: 'Good' }), { id: 42 }, null]);
    expect(parsePresetPack(text)?.map((preset) => preset.name)).toEqual(['Good']);
  });

  it('distinguishes "not a pack" from "a pack holding nothing custom"', () => {
    // The caller reports these differently, and neither may be treated as a successful import of
    // nothing: importing replaces the collection, so obeying an empty result would delete the lot.
    expect(parsePresetPack('<html>not a pack</html>')).toBeNull();
    expect(parsePresetPack('{"not":"an array"}')).toBeNull();
    expect(parsePresetPack(JSON.stringify(PRESETS))).toEqual([]);
  });

  it('refuses an array of records that are not archetypes', () => {
    // A pack of quantiser presets is exactly that: an array of objects with an id, a name and a
    // description, and no `category`. Reported as "not a pack" rather than as an empty one, which
    // would tell a reader who picked the wrong file that their own library held nothing.
    const quantisePack = JSON.stringify([
      { id: 'quantise-1', name: 'Flat sheets', description: '', dials: {} },
    ]);

    expect(parsePresetPack(quantisePack)).toBeNull();
  });
});

describe('the two halves agree about the built-ins', () => {
  it('round-trips an export back to exactly the custom presets that went in', () => {
    // The asymmetry is the point: the export writes the built-ins and the import must skip them.
    // If either half changed its mind about that, re-importing your own export would either
    // duplicate every built-in as a custom preset or lose the user's own.
    const mine = [customPreset({ id: 'custom-a', name: 'A' }), customPreset({ id: 'custom-b', name: 'B' })];

    const reimported = parsePresetPack(serialisePresetPack(mine));

    expect(reimported?.map((preset) => preset.name)).toEqual(['A', 'B']);
    expect(reimported?.every((preset) => preset.isCustom)).toBe(true);
    // The description travels with the preset. It is the one field a reader wrote themselves, so
    // losing it in transit would cost more than any of the identifiers around it.
    expect(reimported?.map((preset) => preset.description)).toEqual([
      'A knight of my own.',
      'A knight of my own.',
    ]);
  });

  it('imports a hand-written entry that names no description', () => {
    // Optional in the app, so optional in a pack somebody edited by hand — the entry arrives with an
    // empty description rather than being dropped for a field it never had to carry.
    const text = JSON.stringify([{ id: 'custom-c', name: 'C', category: 'CHARACTER' }]);
    expect(parsePresetPack(text)?.map((preset) => preset.description)).toEqual(['']);
  });
});
