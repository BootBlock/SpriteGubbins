import { describe, expect, it } from 'vitest';
import { cataloguePicks } from '../constants/iconCatalogue/cataloguePicks.ts';
import { ICON_CATALOGUE_GROUPS } from '../constants/iconCatalogue/index.ts';
import { RELIC, SALUTE, SPELL, TOGGLE, customPick } from '../test/customIcons.ts';
import { iconPickId } from './iconPickId.ts';
import { sortIconPicks } from './sortIconPicks.ts';

function ids(picks: Parameters<typeof sortIconPicks>[0]): readonly string[] {
  return sortIconPicks(picks).map(iconPickId);
}

describe('sortIconPicks', () => {
  it('puts picks in the order the catalogue shelves them, across groups', () => {
    expect(ids(cataloguePicks(['system-bags', 'heal-major', 'heal-minor']))).toEqual([
      'heal-minor',
      'heal-major',
      'system-bags',
    ]);
  });

  it('keeps each pick once and drops an id the catalogue does not hold', () => {
    expect(ids(cataloguePicks(['heal-minor', 'retired-icon', 'heal-minor']))).toEqual(['heal-minor']);
  });

  it('leaves the whole catalogue, reversed, in catalogue order', () => {
    const every = ICON_CATALOGUE_GROUPS.flatMap((group) => group.entries.map((entry) => entry.id));
    expect(ids(cataloguePicks([...every].reverse()))).toEqual(every);
  });

  it('puts the reader’s own entries at the end of their kind’s shelves, in the order they were added', () => {
    const lastItem = ICON_CATALOGUE_GROUPS.filter((group) => group.kind === 'ITEM')
      .at(-1)
      ?.entries.at(-1)?.id;
    const firstSpell = ICON_CATALOGUE_GROUPS.find((group) => group.kind === 'SPELL')?.entries[0]?.id;
    if (lastItem === undefined || firstSpell === undefined) throw new Error('The catalogue lost a kind');
    const second = { ...RELIC, id: 'second-relic', role: 'Second relic' };

    const sorted = ids([
      customPick(TOGGLE),
      customPick(second),
      ...cataloguePicks(['system-bags', firstSpell, 'thermal-strike', lastItem, 'heal-minor']),
      customPick(SPELL),
      customPick(RELIC),
      customPick(SALUTE),
    ]);

    expect(sorted).toEqual([
      'heal-minor',
      lastItem,
      'second-relic',
      'nightcity-keycard-relic',
      firstSpell,
      'thermal-strike',
      'grid-collapse',
      'gang-salute',
      'system-bags',
      'cloak-field',
    ]);
  });

  it('keeps one pick per slot name, the first of them', () => {
    const renamed = { ...RELIC, look: 'a second look' };
    expect(sortIconPicks([customPick(RELIC), customPick(renamed)])).toEqual([customPick(RELIC)]);
  });
});
