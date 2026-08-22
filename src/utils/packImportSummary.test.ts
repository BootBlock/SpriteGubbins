import { describe, expect, it } from 'vitest';
import { PRESET_PACK_ITEMS, QUANTISE_PACK_ITEMS } from '../constants/packImport.ts';
import { countPackItems, describePackImported, describePackReplacement } from './packImportSummary.ts';

describe('countPackItems', () => {
  it('uses the singular for exactly one', () => {
    expect(countPackItems(1, PRESET_PACK_ITEMS)).toBe('1 custom preset');
  });

  it('uses the plural for anything else, nought included', () => {
    expect(countPackItems(0, PRESET_PACK_ITEMS)).toBe('0 custom presets');
    expect(countPackItems(11, PRESET_PACK_ITEMS)).toBe('11 custom presets');
  });

  it('speaks each collection’s own word for its members', () => {
    expect(countPackItems(2, QUANTISE_PACK_ITEMS)).toBe('2 saved settings');
  });
});

describe('describePackReplacement', () => {
  it('names both figures, because either alone is the half the reader does not need', () => {
    const sentence = describePackReplacement(4, 11, PRESET_PACK_ITEMS);

    expect(sentence).toContain('4 custom presets');
    expect(sentence).toContain('11 custom presets');
    expect(sentence).toContain('no undo');
  });

  it('says nothing about deleting when the reader has saved nothing', () => {
    // The first visit, where a warning about work nobody has done yet is friction and nothing else.
    const sentence = describePackReplacement(4, 0, QUANTISE_PACK_ITEMS);

    expect(sentence).toContain('4 saved settings');
    expect(sentence).toContain('deletes nothing of yours');
    expect(sentence).not.toContain('no undo');
  });
});

describe('describePackImported', () => {
  it('reports the deletion as well as the arrival', () => {
    // The old wording said only the first half, which is true of a library that had eleven and now
    // has four — and a reader who never opened the tooltip learned nothing from it.
    expect(describePackImported(4, 11, PRESET_PACK_ITEMS)).toBe('Imported 4 custom presets, replacing 11');
  });

  it('reports the arrival alone when nothing was replaced', () => {
    expect(describePackImported(1, 0, QUANTISE_PACK_ITEMS)).toBe('Imported 1 saved setting');
  });
});
