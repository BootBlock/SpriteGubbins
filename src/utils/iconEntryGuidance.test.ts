import { describe, expect, it } from 'vitest';
import { ICON_CATALOGUE_GROUPS, iconCatalogueEntry } from '../constants/iconCatalogue/index.ts';
import { everyLookWorld } from '../test/iconCatalogueSubjects.ts';
import type { IconCatalogueEntry } from '../types/iconCatalogue.ts';
import { guidanceMarkupProblems } from './guidanceMarkupProblems.ts';
import { iconEntryGuidance } from './iconEntryGuidance.ts';
import { iconLookText } from './iconLookText.ts';

/**
 * The card behind every catalogue row, written for every entry under every look a world can send.
 *
 * The prose, punctuation, length and repetition rules every card is held to are the guidance suite's
 * (`constants/tooltips/tooltips.test.ts`), which walks these same cards; this file holds what is
 * particular to them — that each says what its row adds and what the sheet will draw.
 */
const CASES = ICON_CATALOGUE_GROUPS.flatMap((group) => group.entries).flatMap((entry) =>
  everyLookWorld().map((world) => [entry.id, world, entry] as const),
);

function entry(id: string): IconCatalogueEntry {
  const found = iconCatalogueEntry(id);
  if (found === undefined) throw new Error(`No catalogue entry ${id}`);
  return found;
}

describe('iconEntryGuidance', () => {
  it.each(CASES)('%s under %s names its slots and the look the sheet draws', (_id, world, subject) => {
    const card = iconEntryGuidance(subject, world);

    expect(guidanceMarkupProblems(card)).toEqual([]);
    expect(card).toContain(iconLookText(subject, world));
    const slots =
      subject.states === undefined ? [subject.id] : subject.states.map((state) => `${subject.id}-${state}`);
    for (const slot of slots) expect(card).toContain(`\`${slot}\``);
  });

  it('says a two-state entry is two components sharing a sheet, and a single one is one', () => {
    expect(iconEntryGuidance(entry('system-sound'), 'Modern Day')).toContain(
      'drawn unmuted and then muted, so it counts as two of the set’s components',
    );
    expect(iconEntryGuidance(entry('heal-minor'), 'Modern Day')).toContain('It is one drawing');
  });

  it('says where an entry may show a figure, and only there', () => {
    const figure = ICON_CATALOGUE_GROUPS.flatMap((group) => group.entries).find(
      (each) => each.figure === true,
    );
    if (figure === undefined) throw new Error('The catalogue declares no figure');

    expect(iconEntryGuidance(figure, 'Modern Day')).toContain('a hand, a face or a figure');
    expect(iconEntryGuidance(entry('heal-minor'), 'Modern Day')).not.toContain('a hand, a face or a figure');
  });

  it('says so when no world is set', () => {
    expect(iconEntryGuidance(entry('heal-minor'), '  ')).toContain(
      'With no World & Era set, the sheet draws it as',
    );
  });
});
