import { describe, expect, it } from 'vitest';
import { cataloguePicks } from '../constants/iconCatalogue/cataloguePicks.ts';
import { RELIC, SPELL, TOGGLE, customPick } from '../test/customIcons.ts';
import { iconRosterTally } from './iconRosterTally.ts';

describe('iconRosterTally', () => {
  it('counts icons, components with a pair counted twice, and each kind', () => {
    expect(
      iconRosterTally(
        cataloguePicks([
          'heal-minor',
          'thermal-strike',
          'ability-stealth',
          'emote-wave',
          'pet-drone',
          'craft-cooking',
          'system-sound',
          'pin-quest-available',
        ]),
      ),
    ).toEqual({
      icons: 8,
      components: 10,
      byKind: { ITEM: 1, SPELL: 2, SOCIAL: 1, COMPANION: 1, PROFESSION: 1, SYSTEM: 2 },
      custom: 0,
    });
  });

  it('counts the reader’s own entries under their kinds, a pair twice, and how many are theirs', () => {
    const picks = [
      ...cataloguePicks(['heal-minor']),
      customPick(RELIC),
      customPick(SPELL),
      customPick(TOGGLE),
    ];
    expect(iconRosterTally(picks)).toEqual({
      icons: 4,
      components: 5,
      byKind: { ITEM: 2, SPELL: 1, SOCIAL: 0, COMPANION: 0, PROFESSION: 0, SYSTEM: 1 },
      custom: 3,
    });
  });

  it('skips an id the catalogue does not hold, as the sheets do', () => {
    expect(iconRosterTally(cataloguePicks(['retired-icon']))).toEqual({
      icons: 0,
      components: 0,
      byKind: { ITEM: 0, SPELL: 0, SOCIAL: 0, COMPANION: 0, PROFESSION: 0, SYSTEM: 0 },
      custom: 0,
    });
  });
});
