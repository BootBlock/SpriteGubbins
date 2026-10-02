import { describe, expect, it } from 'vitest';
import { cataloguePicks } from '../constants/iconCatalogue/cataloguePicks.ts';
import { RELIC, SALUTE, SPELL, TOGGLE, customPick } from '../test/customIcons.ts';
import type { IconCatalogueFilter } from '../types/iconCatalogue.ts';
import { customIconShelves } from './customIconShelves.ts';

const EVERYTHING: IconCatalogueFilter = { query: '', kind: 'ALL', school: 'ALL', tickedOnly: false };

const PICKS = [
  ...cataloguePicks(['heal-minor', 'system-bags']),
  customPick(RELIC),
  customPick(SPELL),
  customPick(SALUTE),
  customPick(TOGGLE),
];

/** Each shelf's label and its entries' ids, for a filter laid over {@link EVERYTHING}. */
function shelvesFor(filter: Partial<IconCatalogueFilter>, world = 'High Fantasy') {
  return customIconShelves(PICKS, { ...EVERYTHING, ...filter }, world).map((shelf) => [
    shelf.label,
    shelf.entries.map((entry) => entry.id),
  ]);
}

describe('customIconShelves', () => {
  it('shelves the reader’s own entries by kind, in the kinds’ order, and nothing from the catalogue', () => {
    expect(shelvesFor({})).toEqual([
      ['Items and consumables: your own', ['nightcity-keycard-relic']],
      ['Spells and abilities: your own', ['grid-collapse']],
      ['Emotes and chat: your own', ['gang-salute']],
      ['Interface and system: your own', ['cloak-field']],
    ]);
  });

  it('narrows them by the same search, kind, school and ticked filters as the catalogue', () => {
    expect(shelvesFor({ query: 'brass KEYCARD' })).toEqual([
      ['Items and consumables: your own', ['nightcity-keycard-relic']],
    ]);
    expect(shelvesFor({ query: 'your own interface' })).toEqual([
      ['Interface and system: your own', ['cloak-field']],
    ]);
    expect(shelvesFor({ kind: 'SOCIAL' })).toEqual([['Emotes and chat: your own', ['gang-salute']]]);
    expect(shelvesFor({ kind: 'SPELL', school: 'CRYO' })).toEqual([]);
    expect(shelvesFor({ kind: 'SPELL', school: 'VOLTAIC' })).toEqual([
      ['Spells and abilities: your own', ['grid-collapse']],
    ]);
    // Every one is on the set, so the ticked-only filter keeps them all.
    expect(shelvesFor({ tickedOnly: true })).toHaveLength(4);
  });

  it('finds a spell by the name its world gives the school', () => {
    expect(shelvesFor({ query: 'storm school' }, 'High Fantasy')).toHaveLength(1);
    expect(shelvesFor({ query: 'storm school' }, 'Near-Future Cyberpunk')).toEqual([]);
  });
});
