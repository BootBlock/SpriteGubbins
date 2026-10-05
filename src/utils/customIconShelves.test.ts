import { describe, expect, it } from 'vitest';
import { cataloguePicks } from '../constants/iconCatalogue/cataloguePicks.ts';
import { RELIC, SALUTE, SPELL, TOGGLE, customPick } from '../test/customIcons.ts';
import type { IconCatalogueFilter } from '../types/iconCatalogue.ts';
import type { SavedCustomIcon } from '../types/savedCustomIcon.ts';
import { customIconShelves } from './customIconShelves.ts';

const EVERYTHING: IconCatalogueFilter = { query: '', kind: 'ALL', school: 'ALL', tickedOnly: false };

const PICKS = [
  ...cataloguePicks(['heal-minor', 'system-bags']),
  customPick(RELIC),
  customPick(SPELL),
  customPick(SALUTE),
  customPick(TOGGLE),
];

/** A library row of the Default project. */
function saved(entry: SavedCustomIcon['entry'], id = `row-${entry.id}`): SavedCustomIcon {
  return { id, projectId: 'default', entry };
}

/** Each shelf's label and its rows' ids, for a filter laid over {@link EVERYTHING}. */
function shelvesFor(filter: Partial<IconCatalogueFilter>, world = 'High Fantasy') {
  return customIconShelves(PICKS, [], { ...EVERYTHING, ...filter }, world).map((shelf) => [
    shelf.label,
    shelf.rows.map((row) => row.entry.id),
  ]);
}

describe('customIconShelves', () => {
  it('shelves the reader’s own entries by kind, in the kinds’ order, and nothing from the catalogue', () => {
    expect(shelvesFor({})).toEqual([
      ['Items and consumables: your own', ['nightcity-keycard-relic']],
      ['Spells and abilities: your own', ['grid-collapse']],
      ['Emotes, chat and factions: your own', ['gang-salute']],
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
    expect(shelvesFor({ kind: 'SOCIAL' })).toEqual([
      ['Emotes, chat and factions: your own', ['gang-salute']],
    ]);
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

  it('shows the library’s entries unticked beside the set’s, one row per slot, in role order', () => {
    const second = { ...RELIC, id: 'ancient-coin', role: 'Ancient coin', look: 'a worn coin' };
    const [shelf] = customIconShelves([customPick(RELIC)], [saved(RELIC), saved(second)], EVERYTHING, '');

    expect(shelf?.rows.map((row) => [row.entry.id, row.ticked, row.saved?.id, row.differs])).toEqual([
      ['ancient-coin', false, 'row-ancient-coin', false],
      [RELIC.id, true, `row-${RELIC.id}`, false],
    ]);
  });

  it('keeps an entry only the set holds, and says where the set’s copy is not the library’s', () => {
    const moved = { ...RELIC, look: 'a cracked keycard' };
    const rows = (library: readonly SavedCustomIcon[]) =>
      customIconShelves([customPick(RELIC)], library, EVERYTHING, '')[0]?.rows ?? [];

    expect(rows([]).map((row) => [row.ticked, row.saved, row.differs])).toEqual([[true, undefined, false]]);
    const [differing] = rows([saved(moved)]);
    expect(differing?.entry).toEqual(RELIC);
    expect(differing?.differs).toBe(true);
  });

  it('searches and filters the library’s unticked entries, and Ticked only hides them', () => {
    const library = [saved(SPELL), saved(TOGGLE)];
    const find = (filter: Partial<IconCatalogueFilter>) =>
      customIconShelves([], library, { ...EVERYTHING, ...filter }, 'High Fantasy').flatMap((shelf) =>
        shelf.rows.map((row) => row.entry.id),
      );

    expect(find({})).toEqual([SPELL.id, TOGGLE.id]);
    expect(find({ query: 'shimmer' })).toEqual([TOGGLE.id]);
    expect(find({ kind: 'SPELL', school: 'VOLTAIC' })).toEqual([SPELL.id]);
    expect(find({ tickedOnly: true })).toEqual([]);
  });
});
