import { describe, expect, it } from 'vitest';
import { iconRosterTally } from './iconRosterTally.ts';

describe('iconRosterTally', () => {
  it('counts icons, components with a pair counted twice, and each kind', () => {
    expect(
      iconRosterTally([
        'heal-minor',
        'thermal-strike',
        'ability-stealth',
        'emote-wave',
        'pet-drone',
        'craft-cooking',
        'system-sound',
        'pin-quest-available',
      ]),
    ).toEqual({
      icons: 8,
      components: 10,
      byKind: { ITEM: 1, SPELL: 2, SOCIAL: 1, COMPANION: 1, PROFESSION: 1, SYSTEM: 2 },
    });
  });

  it('skips an id the catalogue does not hold, as the sheets do', () => {
    expect(iconRosterTally(['retired-icon'])).toEqual({
      icons: 0,
      components: 0,
      byKind: { ITEM: 0, SPELL: 0, SOCIAL: 0, COMPANION: 0, PROFESSION: 0, SYSTEM: 0 },
    });
  });
});
