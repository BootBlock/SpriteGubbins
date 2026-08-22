import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_PRESET, PRESETS } from '../constants/presets/index.ts';
import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';
import type { PresetArchetype } from '../types/preset.ts';
import type { QuantisePreset } from '../types/quantisePreset.ts';
import { parsePresetPack, serialisePresetPack } from './presetPack.ts';
import { parseQuantisePresetPack, serialiseQuantisePresetPack } from './quantisePresetPack.ts';

function savedSet(overrides: Partial<QuantisePreset> = {}): QuantisePreset {
  return {
    id: 'quantise-1',
    name: 'Flat sheets',
    description: 'What the armour sheets want.',
    dials: { ...QUANTISE_DEFAULT_DIALS, colorMerge: 24, cleanupPasses: 3 },
    ...overrides,
  };
}

function archetype(): PresetArchetype {
  return {
    id: 'custom-1',
    name: 'My Knight',
    description: 'A knight of my own.',
    category: 'CHARACTER',
    subject: defaultSubjectFor('CHARACTER'),
    output: DEFAULT_PRESET.output,
    isCustom: true,
  };
}

describe('serialiseQuantisePresetPack', () => {
  it('writes the whole collection, with nothing filtered out', () => {
    // Unlike the archetype pack, which carries built-ins the import must skip. The quantiser ships
    // none — the defaults are where the tab opens, not an entry in a collection — so every preset
    // in one of these files is the reader's own.
    const parsed: unknown = JSON.parse(
      serialiseQuantisePresetPack([savedSet(), savedSet({ id: 'quantise-2' })]),
    );
    expect(Array.isArray(parsed) && parsed).toHaveLength(2);
  });

  it('is valid JSON with nothing saved', () => {
    expect(JSON.parse(serialiseQuantisePresetPack([]))).toEqual([]);
  });
});

describe('parseQuantisePresetPack', () => {
  it('round-trips every dial, which is the whole of what a set is', () => {
    const mine = savedSet({ dials: { ...QUANTISE_DEFAULT_DIALS, colorMerge: 24, symmetry: 'CHECK' } });

    const reimported = parseQuantisePresetPack(serialiseQuantisePresetPack([mine]));

    expect(reimported).toEqual([mine]);
  });

  it('drops entries it cannot vouch for and keeps the rest', () => {
    const text = JSON.stringify([savedSet({ id: 'quantise-good', name: 'Good' }), { id: 42 }, null]);
    expect(parseQuantisePresetPack(text)?.map((preset) => preset.name)).toEqual(['Good']);
  });

  it('repairs a dial it cannot read rather than dropping the set that carried it', () => {
    // The rule `parseQuantiseDials` states: field by field, because a set whose ink threshold was
    // corrupted is still the set the reader saved in every other respect.
    // Written as the file's own shape rather than through the fixture: the point is a value the
    // app's types cannot hold, which is exactly what a hand-edited file may carry.
    const text = JSON.stringify([
      { id: 'quantise-e', name: 'E', dials: { ...QUANTISE_DEFAULT_DIALS, inkThreshold: 'wrong' } },
    ]);
    expect(parseQuantisePresetPack(text)?.[0]?.dials.inkThreshold).toBe(QUANTISE_DEFAULT_DIALS.inkThreshold);
  });

  it('imports a hand-written entry that names no description', () => {
    const text = JSON.stringify([{ id: 'quantise-c', name: 'C', dials: {} }]);
    expect(parseQuantisePresetPack(text)?.map((preset) => preset.description)).toEqual(['']);
  });

  it('distinguishes "not a pack" from "a pack holding nothing"', () => {
    // Neither may be treated as a successful import of nothing: importing replaces the collection,
    // so obeying an empty result would delete every set the reader has saved.
    expect(parseQuantisePresetPack('<html>not a pack</html>')).toBeNull();
    expect(parseQuantisePresetPack('{"not":"an array"}')).toBeNull();
    expect(parseQuantisePresetPack('[]')).toEqual([]);
  });
});

describe('a repeated id', () => {
  // Storage collapses one and the store does not: SQLite keeps one row per id, the localStorage
  // fallback keeps both, and the panel shows whatever the parser returned. Deduplicating here is
  // what stops the app announcing a collection it does not hold.
  it('keeps the first entry and discards the later one', () => {
    const text = JSON.stringify([
      savedSet({ id: 'quantise-1', name: 'First' }),
      savedSet({ id: 'quantise-1', name: 'Second' }),
    ]);

    expect(parseQuantisePresetPack(text)?.map((preset) => preset.name)).toEqual(['First']);
  });

  it('is deduplicated in the archetype pack too, by the same rule', () => {
    const text = JSON.stringify([
      { id: 'custom-1', name: 'First', category: 'CHARACTER' },
      { id: 'custom-1', name: 'Second', category: 'CHARACTER' },
    ]);

    expect(parsePresetPack(text)?.map((preset) => preset.name)).toEqual(['First']);
  });
});

describe('the two packs refuse each other', () => {
  // Both files are JSON arrays of objects carrying an id, a name and a description, and they land
  // in the same downloads folder. Each side's discrimination is a field the other cannot have.
  it('refuses a pack of studio archetypes rather than importing it as defaulted dials', () => {
    // The failure this prevents: `parseQuantiseDials` repairs field by field, so without the
    // required `dials` record every archetype would arrive as a set of twenty dials nobody chose.
    expect(parseQuantisePresetPack(serialisePresetPack([archetype()]))).toBeNull();
  });

  it('refuses an entry whose dials are an array, which JavaScript alone calls an object', () => {
    // `parseQuantiseDials` repairs field by field, so an array reaching it returns the twenty
    // defaults wholesale — a foreign file arriving as a complete, deliberate-looking record. The
    // exclusion is in `isRecord` itself, because no parser built on it wants an array.
    expect(parseQuantisePresetPack(JSON.stringify([{ id: 'q', name: 'Q', dials: [] }]))).toBeNull();
  });

  it('refuses an entry whose dials are not a record', () => {
    const text = JSON.stringify([{ id: 'quantise-d', name: 'D', dials: 'all of them' }]);
    expect(parseQuantisePresetPack(text)).toBeNull();
  });

  it('is refused by the archetype pack in the same way', () => {
    // Stated here rather than only in `presetPack.test.ts`, because the pair is the claim: an
    // archetype has no `dials` and one of these has no `category`, and each parser requires the
    // field the other lacks.
    expect(parsePresetPack(serialiseQuantisePresetPack([savedSet()]))).toBeNull();
    // And the built-ins still read as a pack that simply holds nothing custom, which is a different
    // answer from "not a pack" and must stay one.
    expect(parsePresetPack(JSON.stringify(PRESETS))).toEqual([]);
  });
});
