import { describe, expect, it } from 'vitest';
import { CUSTOM_ICON_WARNING_TEXT } from '../constants/iconCatalogue/customIconWarningText.ts';
import { NEUTRAL_RARITY_TIER, RARITY_TIERS } from '../constants/iconCatalogue/rarityTiers.ts';
import { RELIC_DRAFT } from '../test/customIcons.ts';
import type { CustomIconDraft } from '../types/customIconDraft.ts';
import { checkCustomIcon } from './checkCustomIcon.ts';
import { customIconWarnings } from './customIconWarnings.ts';

function warn(
  draft: Partial<CustomIconDraft>,
  key: Parameters<typeof customIconWarnings>[1] = 'MAGENTA_FF00FF',
  tier: string = NEUTRAL_RARITY_TIER,
) {
  return customIconWarnings({ ...RELIC_DRAFT, ...draft }, key, tier);
}

/** A family told apart by tier: the two members a set drawn at one tier would draw alike. */
const TIERED = [
  { name: 'Common', look: '' },
  { name: 'rare', look: 'with a gilded rim' },
] as const;

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

  it('warns of chrome and the other near-white words on the white key, and spares a word that only starts alike', () => {
    expect(warn({ look: 'a chrome keycard' }, 'PURE_WHITE')).toEqual([
      CUSTOM_ICON_WARNING_TEXT.keyColour('chrome', 'PURE_WHITE'),
    ]);
    expect(warn({ look: 'a frosted keycard' }, 'PURE_WHITE')).toEqual([
      CUSTOM_ICON_WARNING_TEXT.keyColour('frost', 'PURE_WHITE'),
    ]);
    expect(warn({ look: 'a paladin keycard' }, 'PURE_WHITE')).toEqual([]);
  });

  it('measures the colour against the key in force, and names none on a transparent key', () => {
    expect(warn({ look: 'a white keycard' }, 'MAGENTA_FF00FF')).toEqual([]);
    expect(warn({ look: 'a magenta keycard' }, 'TRANSPARENT')).toEqual([]);
  });

  it.each([
    ['PURE_WHITE', 'a soft orb of #FFFFFF light', '#FFFFFF'],
    ['PURE_WHITE', 'a soft orb of #fafafa light', '#fafafa'],
    ['PURE_WHITE', 'a soft orb of #FFF light', '#FFF'],
    ['MAGENTA_FF00FF', 'a spike glowing #FF10F0', '#FF10F0'],
    ['PURE_BLACK', 'a keycard of #000 lacquer', '#000'],
  ] as const)(
    'warns under %s of a hex colour the key reaches, and never calls it lettering',
    (key, look, hex) => {
      expect(warn({ look }, key)).toEqual([CUSTOM_ICON_WARNING_TEXT.keyColour(hex, key)]);
    },
  );

  it('lets a hex colour the key does not reach pass, on any key', () => {
    expect(warn({ look: 'a soft orb of #FFFFFF light' }, 'MAGENTA_FF00FF')).toEqual([]);
    expect(warn({ look: 'an orb of #F97316 flame and #ABC haze' }, 'PURE_WHITE')).toEqual([]);
    expect(warn({ look: 'a soft orb of #FFFFFF light' }, 'TRANSPARENT')).toEqual([]);
    // A capitalised word beside a hex is still an acronym.
    expect(warn({ look: 'an EMP orb of #F97316 light' }, 'PURE_WHITE')).toEqual([
      CUSTOM_ICON_WARNING_TEXT.lettering('EMP'),
    ]);
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
    ['a sigil', 'a keycard stamped with a sigil', 'sigil'],
    ['a dog tag', 'a dog tag on a chain', 'dog tag'],
    ['a writing surface not called blank', 'a folded road map', 'map'],
  ])('warns of %s', (_what, look, word) => {
    expect(warn({ look })).toEqual([CUSTOM_ICON_WARNING_TEXT.lettering(word)]);
  });

  it('lets a rolled scroll, a blank map and a map pin pass', () => {
    expect(warn({ look: 'a rolled scroll tied with wire' })).toEqual([]);
    expect(warn({ look: 'a plain folded map' })).toEqual([]);
    expect(warn({ look: 'a red map pin' })).toEqual([]);
  });

  it('warns of a red cross that is not called diagonal', () => {
    expect(warn({ look: 'a white box with a red cross' })).toEqual([
      CUSTOM_ICON_WARNING_TEXT.redCross('a white box with a red cross'),
    ]);
    expect(warn({ look: 'a blank tag, a cross painted crimson' })).toEqual([
      CUSTOM_ICON_WARNING_TEXT.redCross('a cross painted crimson'),
    ]);
    expect(warn({ look: 'a red diagonal cross' })).toEqual([]);
  });

  it('warns of a person or part of one unless the entry shows a figure', () => {
    expect(warn({ look: 'a keycard in a gloved hand' })).toEqual([CUSTOM_ICON_WARNING_TEXT.figure('hand')]);
    expect(warn({ look: 'a keycard in a gloved hand', figure: true })).toEqual([]);
  });

  it('reads the role, the states and a family’s members as well as the look', () => {
    expect(warn({ role: 'Black relic' }, 'PURE_BLACK')).toHaveLength(1);
    expect(warn({ states: ['face up', 'face down'] })).toEqual([CUSTOM_ICON_WARNING_TEXT.figure('face')]);
    expect(
      warn({
        variants: [
          { name: 'small', look: '' },
          { name: 'held', look: 'in a gloved hand' },
        ],
      }),
    ).toEqual([CUSTOM_ICON_WARNING_TEXT.figure('hand')]);
  });

  it('warns of a member naming a tier the set’s Rarity Tier draws every icon at, and only then', () => {
    // Under `Epic` every icon is drawn epic, so a common and a rare member come back alike.
    const tier = RARITY_TIERS.at(-2) ?? '';
    expect(warn({ variants: TIERED }, 'MAGENTA_FF00FF', tier)).toEqual([
      CUSTOM_ICON_WARNING_TEXT.rarityTier('Common', tier),
    ]);
    // The neutral emphasis leaves the tiers to the overlay marks, which is what such a family needs,
    // and a cleared or typed value states no tier for a member to disagree with.
    expect(warn({ variants: TIERED })).toEqual([]);
    expect(warn({ variants: TIERED }, 'MAGENTA_FF00FF', '')).toEqual([]);
    expect(warn({ variants: TIERED }, 'MAGENTA_FF00FF', 'Battle-scarred')).toEqual([]);
    // A role naming a tier describes one icon, which a set-wide tier does not contradict.
    expect(warn({ role: 'Rare relic' }, 'MAGENTA_FF00FF', tier)).toEqual([]);
    // `uncommon` is not `common`.
    expect(
      warn({ variants: [{ name: 'uncommonly big', look: '' }, TIERED[1]] }, 'MAGENTA_FF00FF', 'Rare'),
    ).toEqual([CUSTOM_ICON_WARNING_TEXT.rarityTier('rare', 'Rare')]);
  });

  it('reports every rule a draft breaks, and never stops the check passing it', () => {
    const draft = { ...RELIC_DRAFT, look: 'a white keycard with a dial in a hand' };
    expect(customIconWarnings(draft, 'PURE_WHITE', NEUTRAL_RARITY_TIER)).toHaveLength(3);
    expect(checkCustomIcon(draft, [], null, []).entry?.look).toBe(draft.look);
  });
});
