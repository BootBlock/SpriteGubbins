import { describe, expect, it } from 'vitest';
import { PRESETS } from '../constants/presets/index.ts';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import type { PresetArchetype } from '../types/preset.ts';
import { countByCollection, indexPresetLibrary, matchPresetEntries } from './presetSearch.ts';

/**
 * The library's search, tested against the real library rather than a fixture.
 *
 * The queries below are the ones a user actually types — a word from a name, a term from a dropdown, a
 * material — and the point of running them over the shipped presets is that a preset renamed or
 * re-styled out from under one of them fails here rather than quietly returning nothing in the app.
 */
const LIBRARY = indexPresetLibrary(PRESETS);

/** A saved preset, which is filed by ownership rather than by category. */
const MINE: PresetArchetype = { ...DEFAULT_PRESET, id: 'custom-1', name: 'My Knight', isCustom: true };

function namesFor(query: string): readonly string[] {
  return matchPresetEntries(LIBRARY, query).map((entry) => entry.preset.name);
}

describe('indexPresetLibrary', () => {
  it('numbers every entry by its position in the whole library', () => {
    // The hue-wheel stop is derived from this, and it has to be the un-filtered position: a card that
    // changed colour while the user typed would read as a status change rather than an allocation.
    expect(LIBRARY.map((entry) => entry.index)).toEqual(PRESETS.map((_, index) => index));
  });

  it('files a saved preset under the user’s own collection, not its category', () => {
    const [entry] = indexPresetLibrary([MINE]);
    expect(entry?.collection).toBe('custom');
    expect(MINE.category).toBe('CHARACTER');
  });

  it('files a built-in under its category', () => {
    const entry = LIBRARY.find((candidate) => candidate.preset.id === DEFAULT_PRESET.id);
    expect(entry?.collection).toBe('CHARACTER');
  });
});

describe('matchPresetEntries', () => {
  it('hands back the very same array for an empty query', () => {
    // By reference, not merely by value: the un-filtered list must not be a new array on every render,
    // or the memo above it is defeated and the grid is rebuilt for nothing.
    expect(matchPresetEntries(LIBRARY, '')).toBe(LIBRARY);
    expect(matchPresetEntries(LIBRARY, '   ')).toBe(LIBRARY);
  });

  it('finds a preset by a word from its name', () => {
    expect(namesFor('katana')).toContain('Cyberpunk Katana Specialist');
  });

  it('finds presets by an output identifier, typed as words', () => {
    // `TRUE_ISOMETRIC` normalises to `true isometric`, so the term a user would say finds the setting
    // the prompt is written against.
    const isometric = namesFor('isometric');
    expect(isometric).toContain('Isometric Cut-Out Rig');
    expect(isometric).toContain('Isometric City Tileset');
  });

  it('accepts the underscore, the space and the hyphen as the same query', () => {
    expect(namesFor('pixel_art')).toEqual(namesFor('pixel art'));
    expect(namesFor('pixel-art')).toEqual(namesFor('pixel art'));
  });

  it('narrows as terms are added rather than widening', () => {
    const iso = namesFor('isometric');
    const isoRig = namesFor('isometric rig');

    expect(isoRig.length).toBeLessThan(iso.length);
    expect(isoRig).toContain('Isometric Cut-Out Rig');
    expect(isoRig).not.toContain('Isometric City Tileset');
  });

  it('matches terms in any order', () => {
    expect(namesFor('rig isometric')).toEqual(namesFor('isometric rig'));
  });

  it('searches the subject as well as the name', () => {
    // "Ramen Stand Kiosk" is the subject's structure type, and the kiosk preset is the only one there.
    expect(namesFor('ramen')).toEqual(['Neo-Tokyo Ramen Kiosk']);
  });

  it('searches the description, which is the only field written in a reader’s own words', () => {
    // "dithers" appears nowhere in that preset's name, subject or settings — those are identifiers,
    // and this is the one field somebody wrote a sentence in. So the query only lands if the
    // description is in the haystack, which is what the search box's own guidance promises.
    expect(namesFor('dithers')).toEqual(['Pixel Explosion Flipbook']);
  });

  it('matches a partial word, because half of what it searches is an identifier', () => {
    expect(namesFor('tile').length).toBeGreaterThan(0);
  });

  it('returns nothing for a query nothing holds, rather than everything', () => {
    expect(namesFor('sentient filing cabinet')).toEqual([]);
  });

  it('preserves the library’s order and the entry objects themselves', () => {
    const matches = matchPresetEntries(LIBRARY, 'pixel art');
    expect(matches.every((entry) => LIBRARY.includes(entry))).toBe(true);
    expect(matches.map((entry) => entry.index)).toEqual(
      [...matches.map((entry) => entry.index)].sort((a, b) => a - b),
    );
  });
});

describe('countByCollection', () => {
  it('counts what each collection holds and omits the ones holding nothing', () => {
    const counts = countByCollection(LIBRARY);

    // Every category ships presets; nobody has saved one, so `custom` is absent rather than zero.
    expect(counts.get('CHARACTER')).toBeGreaterThan(0);
    expect(counts.get('ITEM')).toBeGreaterThan(0);
    expect(counts.has('custom')).toBe(false);

    expect([...counts.values()].reduce((total, count) => total + count, 0)).toBe(PRESETS.length);
  });

  it('counts a filtered set, not the library behind it', () => {
    const counts = countByCollection(matchPresetEntries(LIBRARY, 'ramen'));
    expect([...counts.entries()]).toEqual([['BUILDING', 1]]);
  });
});
