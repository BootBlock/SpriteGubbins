import { describe, expect, it } from 'vitest';
import { ICON_CATALOGUE_GROUPS } from '../constants/iconCatalogue/index.ts';
import { sortIconPicks } from './sortIconPicks.ts';

describe('sortIconPicks', () => {
  it('puts picks in the order the catalogue shelves them, across groups', () => {
    expect(sortIconPicks(['system-bags', 'heal-major', 'heal-minor'])).toEqual([
      'heal-minor',
      'heal-major',
      'system-bags',
    ]);
  });

  it('keeps each pick once and drops an id the catalogue does not hold', () => {
    expect(sortIconPicks(['heal-minor', 'retired-icon', 'heal-minor'])).toEqual(['heal-minor']);
  });

  it('leaves the whole catalogue, reversed, in catalogue order', () => {
    const every = ICON_CATALOGUE_GROUPS.flatMap((group) => group.entries.map((entry) => entry.id));
    expect(sortIconPicks([...every].reverse())).toEqual(every);
  });
});
