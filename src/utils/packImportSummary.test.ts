import { describe, expect, it } from 'vitest';
import { LIBRARY_PACK_ITEMS } from '../constants/packImport.ts';
import {
  countPackItems,
  describeCancelAction,
  describePackImported,
  describePackReplacement,
  describeReplaceAction,
} from './packImportSummary.ts';

describe('countPackItems', () => {
  it('uses the singular for exactly one', () => {
    expect(countPackItems(1, LIBRARY_PACK_ITEMS)).toBe('1 saved item');
  });

  it('uses the plural for anything else, nought included', () => {
    expect(countPackItems(0, LIBRARY_PACK_ITEMS)).toBe('0 saved items');
    expect(countPackItems(11, LIBRARY_PACK_ITEMS)).toBe('11 saved items');
  });

  it('speaks the word it was handed rather than one of its own', () => {
    // The app has one pack and therefore one noun, so this passes a noun the app does not use: a
    // count that had stopped reading its argument would still answer “2 saved items” against
    // `LIBRARY_PACK_ITEMS` and would fail here.
    expect(countPackItems(2, { singular: 'widget', plural: 'widgets' })).toBe('2 widgets');
  });
});

describe('describePackReplacement', () => {
  it('names both figures, because either alone is the half the reader does not need', () => {
    const sentence = describePackReplacement(4, 11, LIBRARY_PACK_ITEMS);

    expect(sentence).toContain('4 saved items');
    expect(sentence).toContain('11 saved items');
    expect(sentence).toContain('no undo');
  });

  it('says nothing about deleting when the reader has saved nothing', () => {
    // The first visit, where a warning about work nobody has done yet is friction and nothing else.
    const sentence = describePackReplacement(4, 0, LIBRARY_PACK_ITEMS);

    expect(sentence).toContain('4 saved items');
    expect(sentence).toContain('deletes nothing of yours');
    expect(sentence).not.toContain('no undo');
  });
});

describe('describePackImported', () => {
  it('reports the deletion as well as the arrival', () => {
    // The old wording said only the first half, which is true of a library that had eleven and now
    // has four — and a reader who never opened the tooltip learned nothing from it.
    expect(describePackImported(4, 11, LIBRARY_PACK_ITEMS)).toBe('Imported 4 saved items, replacing 11');
  });

  it('reports the arrival alone when nothing was replaced', () => {
    expect(describePackImported(1, 0, LIBRARY_PACK_ITEMS)).toBe('Imported 1 saved item');
  });
});

/**
 * The two buttons' accessible names, which carry the figures rather than pointing at the sentence.
 * They have to: `ControlTooltip` clones its child and writes `aria-describedby` itself, so a
 * description set on either button is overwritten.
 */
describe('the confirmation buttons’ accessible names', () => {
  it('says what Replace replaces, and with how much', () => {
    expect(describeReplaceAction(4, LIBRARY_PACK_ITEMS)).toBe(
      'Replace your saved items with the 4 saved items in this file',
    );
  });

  it('says what Cancel keeps, rather than merely that it cancels', () => {
    expect(describeCancelAction(11, LIBRARY_PACK_ITEMS)).toBe(
      'Cancel the import and keep your 11 saved items',
    );
  });

  it('does not offer to keep nothing', () => {
    expect(describeCancelAction(0, LIBRARY_PACK_ITEMS)).toBe('Cancel the import, which changes nothing');
  });
});
