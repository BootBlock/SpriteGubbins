import { describe, expect, it } from 'vitest';
import { ICON_CATALOGUE_GROUPS } from '../constants/iconCatalogue/index.ts';
import type { IconCatalogueFilter } from '../types/iconCatalogue.ts';
import { iconCatalogueSearch } from './iconCatalogueSearch.ts';

const EVERYTHING: IconCatalogueFilter = { query: '', kind: 'ALL', tickedOnly: false };

/** The ids a search leaves, in the order it lists them. */
function idsFor(
  filter: Partial<IconCatalogueFilter>,
  picks: readonly string[] = [],
  world = 'High Fantasy',
): string[] {
  return iconCatalogueSearch(ICON_CATALOGUE_GROUPS, { ...EVERYTHING, ...filter }, picks, world).flatMap(
    (group) => group.entries.map((entry) => entry.id),
  );
}

describe('iconCatalogueSearch', () => {
  it('shows the whole catalogue, in its own order, when nothing narrows it', () => {
    const every = ICON_CATALOGUE_GROUPS.flatMap((group) => group.entries.map((entry) => entry.id));
    expect(idsFor({})).toEqual(every);
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

  it('lists only the ticked icons, and drops a group left empty', () => {
    const groups = iconCatalogueSearch(
      ICON_CATALOGUE_GROUPS,
      { ...EVERYTHING, tickedOnly: true },
      ['system-bags', 'heal-minor'],
      'Modern Day',
    );
    expect(groups.map((group) => group.id)).toEqual(['restoratives', 'system-panels']);
    expect(groups.flatMap((group) => group.entries.map((entry) => entry.id))).toEqual([
      'heal-minor',
      'system-bags',
    ]);
  });
});
