import { describe, expect, it } from 'vitest';
import { ICON_CATALOGUE_GROUPS, iconCatalogueEntry } from '../constants/iconCatalogue/index.ts';
import { everyLookWorld } from '../test/iconCatalogueSubjects.ts';
import type { IconCatalogueEntry } from '../types/iconCatalogue.ts';
import { guidanceMarkupProblems } from './guidanceMarkupProblems.ts';
import { iconEntryGuidance } from './iconEntryGuidance.ts';
import { iconLookText } from './iconLookText.ts';
import { RELIC, SPELL } from '../test/customIcons.ts';

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
    const card = iconEntryGuidance(subject, world, 'FULL_COLOUR');

    expect(guidanceMarkupProblems(card)).toEqual([]);
    expect(card).toContain(iconLookText(subject, world));
    const slots =
      subject.states === undefined ? [subject.id] : subject.states.map((state) => `${subject.id}-${state}`);
    for (const slot of slots) expect(card).toContain(`\`${slot}\``);
  });

  it('says a two-state entry is two components sharing a sheet, and a single one is one', () => {
    expect(iconEntryGuidance(entry('system-sound'), 'Modern Day', 'FULL_COLOUR')).toContain(
      'drawn unmuted and then muted, so it counts as two of the set’s components',
    );
    expect(iconEntryGuidance(entry('heal-minor'), 'Modern Day', 'FULL_COLOUR')).toContain(
      'It is one drawing',
    );
  });

  it('says where an entry may show a figure, and only there', () => {
    const figure = ICON_CATALOGUE_GROUPS.flatMap((group) => group.entries).find(
      (each) => each.figure === true,
    );
    if (figure === undefined) throw new Error('The catalogue declares no figure');

    expect(iconEntryGuidance(figure, 'Modern Day', 'FULL_COLOUR')).toContain('a hand, a face or a figure');
    expect(iconEntryGuidance(entry('heal-minor'), 'Modern Day', 'FULL_COLOUR')).not.toContain(
      'a hand, a face or a figure',
    );
  });

  it('names a spell’s school as the world does, as the line it describes does', () => {
    expect(iconEntryGuidance(entry('thermal-strike'), 'High Fantasy', 'FULL_COLOUR')).toContain(
      'It belongs to the fire school.',
    );
    expect(iconEntryGuidance(entry('thermal-strike'), 'Near-Future Cyberpunk', 'FULL_COLOUR')).toContain(
      'It belongs to the thermal school.',
    );
    expect(iconEntryGuidance(entry('heal-minor'), 'High Fantasy', 'FULL_COLOUR')).not.toContain('school');
  });

  it('says a tint mask draws the school’s colour in grey, rather than promising a hue', () => {
    // A tint mask draws every named colour as its lightness in grey (audit finding M1), so the schools
    // are not told apart at a glance by hue.
    const masked = iconEntryGuidance(entry('thermal-strike'), 'High Fantasy', 'TINT_MASK');

    expect(masked).toContain('as its lightness in grey');
    expect(masked).not.toContain('tells the schools apart at a glance');
    expect(iconEntryGuidance(SPELL, 'High Fantasy', 'TINT_MASK', true)).toContain('as its lightness in grey');
    expect(iconEntryGuidance(SPELL, 'High Fantasy', 'FULL_COLOUR', true)).not.toContain('grey');
  });

  it('says so when no world is set', () => {
    expect(iconEntryGuidance(entry('heal-minor'), '  ', 'FULL_COLOUR')).toContain(
      'With no World & Era set, the sheet draws it as',
    );
  });
});

describe('the card behind a row of the reader’s own', () => {
  it('says the library keeps a copy only where the library holds the icon', () => {
    const held = iconEntryGuidance(RELIC, 'Modern Day', 'FULL_COLOUR', true);
    const setOnly = iconEntryGuidance(RELIC, 'Modern Day', 'FULL_COLOUR', false);

    expect(held).toContain('your library keeps its own copy');
    expect(setOnly).not.toContain('your library keeps');
    expect(setOnly).toContain('unticking takes it away for good');
  });
});
