import { describe, expect, it } from 'vitest';
import { cataloguePicks } from '../constants/iconCatalogue/cataloguePicks.ts';
import { ICON_CATALOGUE_GROUPS } from '../constants/iconCatalogue/index.ts';
import type { IconCatalogueFilter } from '../types/iconCatalogue.ts';
import { iconCatalogueSearch } from './iconCatalogueSearch.ts';

const EVERYTHING: IconCatalogueFilter = { query: '', kind: 'ALL', school: 'ALL', tickedOnly: false };

/** The ids a search leaves, in the order it lists them. */
function idsFor(
  filter: Partial<IconCatalogueFilter>,
  picks: readonly string[] = [],
  world = 'High Fantasy',
): string[] {
  return iconCatalogueSearch(
    ICON_CATALOGUE_GROUPS,
    { ...EVERYTHING, ...filter },
    cataloguePicks(picks),
    world,
  ).flatMap((group) => group.entries.map((entry) => entry.id));
}

describe('iconCatalogueSearch', () => {
  it('shows the whole catalogue, in its own order, when nothing narrows it', () => {
    const every = ICON_CATALOGUE_GROUPS.flatMap((group) => group.entries.map((entry) => entry.id));
    expect(idsFor({})).toEqual(every);
  });

  it('matches a word from its start, so “ping” finds the pings and not a dripping mask', () => {
    const groupsFor = (query: string): string[] =>
      iconCatalogueSearch(ICON_CATALOGUE_GROUPS, { ...EVERYTHING, query }, [], 'High Fantasy').map(
        (group) => group.id,
      );

    expect(groupsFor('ping')).toContain('pings');
    expect(groupsFor('ping')).not.toContain('control-abilities');
    expect(groupsFor('dripping')).toContain('control-abilities');
  });

  it('matches every word typed, in any case, across role, id and group label', () => {
    expect(idsFor({ query: 'MINOR healing' })).toEqual(['heal-minor']);
    expect(idsFor({ query: 'heal-major' })).toEqual(['heal-major']);
    expect(idsFor({ query: 'map pins' })).toEqual(
      ICON_CATALOGUE_GROUPS.find((group) => group.id === 'map-pins')?.entries.map((entry) => entry.id),
    );
  });

  it('searches the look the subject’s world draws, and only that one', () => {
    // A stim-pack is the cyberpunk healing look; the fantasy world draws a potion and does not match.
    expect(idsFor({ query: 'stim-pack' }, [], 'Near-Future Cyberpunk')).toContain('heal-minor');
    expect(idsFor({ query: 'stim-pack' }, [], 'High Fantasy')).toEqual([]);
  });

  it('narrows to one kind of shelf', () => {
    const groups = iconCatalogueSearch(
      ICON_CATALOGUE_GROUPS,
      { ...EVERYTHING, kind: 'SYSTEM' },
      [],
      'Modern Day',
    );
    expect(groups.length).toBeGreaterThan(0);
    expect(groups.every((group) => group.kind === 'SYSTEM')).toBe(true);
  });

  it('narrows to one damage school, which leaves spells alone', () => {
    const groups = iconCatalogueSearch(
      ICON_CATALOGUE_GROUPS,
      { ...EVERYTHING, kind: 'SPELL', school: 'THERMAL' },
      [],
      'Modern Day',
    );
    const entries = groups.flatMap((group) => group.entries);
    expect(entries.map((entry) => entry.id)).toContain('thermal-strike');
    expect(entries.every((entry) => entry.school === 'THERMAL')).toBe(true);
    expect(groups.every((group) => group.kind === 'SPELL')).toBe(true);
  });

  it('finds a spell by the name its world gives the school', () => {
    // The thermal school is fire in a fantasy world and incendiary in a modern one, and this attack's
    // modern look (a flare gun) never says fire, so only the school's name can match the word.
    expect(idsFor({ query: 'fire school' }, [], 'High Fantasy')).toContain('thermal-strike');
    expect(idsFor({ query: 'fire school' }, [], 'Modern Day')).not.toContain('thermal-strike');
    expect(idsFor({ query: 'incendiary school' }, [], 'Modern Day')).toContain('thermal-strike');
  });

  it('lists only the ticked icons, and drops a group left empty', () => {
    const groups = iconCatalogueSearch(
      ICON_CATALOGUE_GROUPS,
      { ...EVERYTHING, tickedOnly: true },
      cataloguePicks(['system-bags', 'heal-minor']),
      'Modern Day',
    );
    expect(groups.map((group) => group.id)).toEqual(['restoratives', 'system-panels']);
    expect(groups.flatMap((group) => group.entries.map((entry) => entry.id))).toEqual([
      'heal-minor',
      'system-bags',
    ]);
  });
});
