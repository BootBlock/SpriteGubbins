import { describe, expect, it } from 'vitest';
import { cataloguePicks } from '../constants/iconCatalogue/cataloguePicks.ts';
import { FAMILY, RELIC, TOGGLE, customPick } from '../test/customIcons.ts';
import type { CustomIconEntry, CustomIconVariant, IconRoster } from '../types/iconRoster.ts';
import { sameIconRoster } from './sameIconRoster.ts';

const ROSTER: IconRoster = {
  look: 'ISOLATED_MARK',
  colourMode: 'FULL_COLOUR',
  picks: cataloguePicks(['heal-minor', 'mana-minor']),
};

/** {@link ROSTER} with the reader's own `entries` after its catalogue picks. */
function withOwn(...entries: readonly CustomIconEntry[]): IconRoster {
  return { ...ROSTER, picks: [...ROSTER.picks, ...entries.map(customPick)] };
}

describe('sameIconRoster', () => {
  it('compares two rosters by value', () => {
    const copy: IconRoster = {
      look: 'ISOLATED_MARK',
      colourMode: 'FULL_COLOUR',
      picks: cataloguePicks(['heal-minor', 'mana-minor']),
    };
    expect(sameIconRoster(ROSTER, copy)).toBe(true);
  });

  it('tells apart a roster with another pick, another order or one pick more', () => {
    expect(sameIconRoster(ROSTER, { ...ROSTER, picks: cataloguePicks(['heal-minor', 'heal-major']) })).toBe(
      false,
    );
    expect(sameIconRoster(ROSTER, { ...ROSTER, picks: cataloguePicks(['mana-minor', 'heal-minor']) })).toBe(
      false,
    );
    const longer = { ...ROSTER, picks: [...ROSTER.picks, ...cataloguePicks(['elixir'])] };
    expect(sameIconRoster(ROSTER, longer)).toBe(false);
  });

  it('holds the reader’s own entries the same when every field is', () => {
    expect(sameIconRoster(withOwn(RELIC, TOGGLE), structuredClone(withOwn(RELIC, TOGGLE)))).toBe(true);
  });

  it.each([
    ['look', { ...RELIC, look: 'a cracked keycard' }],
    ['role', { ...RELIC, role: 'Nightcity keycard relic' }],
    ['kind', { ...RELIC, kind: 'SYSTEM' }],
    ['figure', { ...RELIC, figure: true }],
    ['states', { ...RELIC, states: ['on', 'off'] }],
    ['members', { ...RELIC, variants: [{ name: 'small' }, { name: 'large' }] }],
    ['school', { ...RELIC, kind: 'SPELL', school: 'CRYO' }],
  ] as const)('tells apart an entry of the reader’s own whose %s changed', (_field, changed) => {
    expect(sameIconRoster(withOwn(RELIC, TOGGLE), withOwn(changed, TOGGLE))).toBe(false);
  });

  it('tells apart a family whose members were reordered, renamed, or given a phrase', () => {
    const [small, standard, large] = FAMILY.variants ?? [];
    const changes: readonly (readonly CustomIconVariant[])[] = [
      [large, standard, small].filter((member) => member !== undefined),
      [small, standard].filter((member) => member !== undefined),
      [small, { name: 'standard', look: 'a palm-length pen' }, large].filter(
        (member) => member !== undefined,
      ),
      [small, { name: 'regular' }, large].filter((member) => member !== undefined),
    ];
    expect(sameIconRoster(withOwn(FAMILY), structuredClone(withOwn(FAMILY)))).toBe(true);
    for (const variants of changes) {
      expect(sameIconRoster(withOwn(FAMILY), withOwn({ ...FAMILY, variants }))).toBe(false);
    }
  });

  it('tells apart a pair whose states swapped, and a catalogue pick from an entry of the same name', () => {
    const swapped: CustomIconEntry = { ...TOGGLE, states: ['idle', 'engaged'] };
    expect(sameIconRoster(withOwn(TOGGLE), withOwn(swapped))).toBe(false);
    const named = { ...ROSTER, picks: cataloguePicks([RELIC.id]) };
    expect(sameIconRoster(named, { ...ROSTER, picks: [customPick(RELIC)] })).toBe(false);
  });

  it('holds two absent rosters the same, and an absent one apart from any roster', () => {
    expect(sameIconRoster(undefined, undefined)).toBe(true);
    expect(sameIconRoster(undefined, { look: 'ISOLATED_MARK', colourMode: 'FULL_COLOUR', picks: [] })).toBe(
      false,
    );
  });
});
