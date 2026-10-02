import { describe, expect, it } from 'vitest';
import { CUSTOM_ICON_WARNING_TEXT } from '../constants/iconCatalogue/customIconWarningText.ts';
import { RELIC_DRAFT } from '../test/customIcons.ts';
import type { CustomIconDraft } from '../types/customIconDraft.ts';
import { checkCustomIcon } from './checkCustomIcon.ts';
import { customIconWarnings } from './customIconWarnings.ts';

function warn(
  draft: Partial<CustomIconDraft>,
  key: Parameters<typeof customIconWarnings>[1] = 'MAGENTA_FF00FF',
) {
  return customIconWarnings({ ...RELIC_DRAFT, ...draft }, key);
}

describe('customIconWarnings', () => {
  it('says nothing about an entry the sheet draws as written', () => {
    expect(warn({})).toEqual([]);
  });

  it.each([
    ['MAGENTA_FF00FF', 'a fuchsia-lit keycard', 'fuchsia'],
    ['MAGENTA_FF00FF', 'a pinkish keycard', 'pink'],
    ['PURE_WHITE', 'a white-hot keycard', 'white'],
    ['PURE_BLACK', 'a blackened keycard', 'black'],
  ] as const)('warns under %s of a look naming the key’s colour', (key, look, word) => {
    expect(warn({ look }, key)).toEqual([CUSTOM_ICON_WARNING_TEXT.keyColour(word, key)]);
  });

  it('measures the colour against the key in force, and names none on a transparent key', () => {
    expect(warn({ look: 'a white keycard' }, 'MAGENTA_FF00FF')).toEqual([]);
    expect(warn({ look: 'a magenta keycard' }, 'TRANSPARENT')).toEqual([]);
  });

  it('spares the pink of a netrun spell, whose line pins it by hex, but not its magenta', () => {
    const netrun = { kind: 'SPELL', school: 'NETRUN' } as const;
    expect(warn({ ...netrun, look: 'a hot pink data spike' })).toEqual([]);
    expect(warn({ ...netrun, look: 'a magenta data spike' })).toHaveLength(1);
    expect(warn({ kind: 'SPELL', school: 'CRYO', look: 'a pink data spike' })).toHaveLength(1);
  });

  it.each([
    ['a word asking for lettering', 'a keycard with a serial number', 'number'],
    ['an object that carries it', 'a keycard with a brass dial', 'dial'],
    ['a rune', 'a keycard carved with runes', 'runes'],
    ['a capitalised acronym', 'an EMP keycard', 'EMP'],
    ['an open scroll', 'a scroll of access codes', 'scroll'],
  ])('warns of %s', (_what, look, word) => {
    expect(warn({ look })).toEqual([CUSTOM_ICON_WARNING_TEXT.lettering(word)]);
  });

  it('lets a rolled scroll pass', () => {
    expect(warn({ look: 'a rolled scroll tied with wire' })).toEqual([]);
  });

  it('warns of a person or part of one unless the entry shows a figure', () => {
    expect(warn({ look: 'a keycard in a gloved hand' })).toEqual([CUSTOM_ICON_WARNING_TEXT.figure('hand')]);
    expect(warn({ look: 'a keycard in a gloved hand', figure: true })).toEqual([]);
  });

  it('reads the role and the states as well as the look', () => {
    expect(warn({ role: 'Black relic' }, 'PURE_BLACK')).toHaveLength(1);
    expect(warn({ states: ['face up', 'face down'] })).toEqual([CUSTOM_ICON_WARNING_TEXT.figure('face')]);
  });

  it('reports every rule a draft breaks, and never stops the check passing it', () => {
    const draft = { ...RELIC_DRAFT, look: 'a white keycard with a dial in a hand' };
    expect(customIconWarnings(draft, 'PURE_WHITE')).toHaveLength(3);
    expect(checkCustomIcon(draft, [], null, []).entry?.look).toBe(draft.look);
  });
});
