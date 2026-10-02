import { describe, expect, it } from 'vitest';
import { iconRosterTally } from './iconRosterTally.ts';

describe('iconRosterTally', () => {
  it('counts icons, components with a pair counted twice, and each kind', () => {
    expect(iconRosterTally(['heal-minor', 'system-sound', 'pin-quest-available'])).toEqual({
      icons: 3,
      components: 4,
      byKind: { ITEM: 1, SYSTEM: 2 },
    });
  });

  it('skips an id the catalogue does not hold, as the sheets do', () => {
    expect(iconRosterTally(['retired-icon'])).toEqual({
      icons: 0,
      components: 0,
      byKind: { ITEM: 0, SYSTEM: 0 },
    });
  });
});
