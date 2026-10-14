import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { cataloguePicks } from '../constants/iconCatalogue/cataloguePicks.ts';
import { ICON_CATALOGUE_GROUPS } from '../constants/iconCatalogue/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import { parseIconRoster } from '../db/iconRosterParser.ts';
import { RELIC, SALUTE, SPELL, TOGGLE, customPick, hostileStoredSubject } from '../test/customIcons.ts';
import { sectionOf } from '../test/promptSections.ts';
import type { IconPick } from '../types/iconRoster.ts';
import type { OutputConfig } from '../types/output.ts';
import type { SubjectDefinition } from '../types/subject.ts';
import { componentSlots } from './componentSlots.ts';
import { generatePrompt } from './promptCompiler.ts';

/**
 * An icon of the reader's own compiled: the same line a catalogue entry gets — the role ×N, the look,
 * a spell's school and colour, a pair's two states — its slot named after its role, the sheet's
 * figure rescue reaching a hand its look names whatever its `figure` mark says (the mark changes only
 * the form's warnings and the row's card), chunking keeping its pair together, and a citation in its
 * text never reaching the compiler.
 */

const OUTPUT: OutputConfig = {
  ...DEFAULT_OUTPUT_CONFIG,
  directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
  targetModel: 'CHATGPT_5_6_SOL',
};

const flat = (text: string): string => text.replaceAll(/\s+/g, ' ');

function iconSet(picks: readonly IconPick[], setting = 'Near-Future Cyberpunk'): SubjectDefinition {
  return {
    ...defaultSubjectFor('ICON'),
    setting,
    icons: { look: 'FULL_BLEED_TILE', colourMode: 'FULL_COLOUR', picks },
  };
}

// Sheet 0 is the first icon sheet: the icon sheets open the series and the overlay sheet closes it.
function inventory(subject: SubjectDefinition, sheetIndex = 0): string {
  return flat(sectionOf(generatePrompt('ICON', subject, { ...OUTPUT, sheetIndex }), 'COMPONENT INVENTORY'));
}

function slots(subject: SubjectDefinition, sheetIndex = 0): readonly string[] {
  return componentSlots('ICON', subject, OUTPUT.directionalMode, OUTPUT.directions, sheetIndex, [], null);
}

/** The first `count` one-drawing catalogue entries, in catalogue order. */
function singles(count: number): readonly IconPick[] {
  return cataloguePicks(
    ICON_CATALOGUE_GROUPS.flatMap((group) => group.entries)
      .filter((entry) => entry.states === undefined)
      .slice(0, count)
      .map((entry) => entry.id),
  );
}

describe('an icon of the reader’s own in the compiled prompt', () => {
  it('compiles an item as its role, ×1 and its look, named after its role', () => {
    const subject = iconSet([...cataloguePicks(['heal-minor']), customPick(RELIC)]);
    expect(inventory(subject)).toContain(
      'Nightcity Keycard Relic ×1 — a scorched brass keycard on a snapped chain',
    );
    expect(slots(subject)).toEqual(['heal-minor', 'nightcity-keycard-relic']);
  });

  it.each([
    ['Near-Future Cyberpunk', 'voltaic'],
    ['High Fantasy', 'storm'],
    ['Clockwork Moon Colony', 'voltaic'],
  ])(
    'closes a spell on its school’s name in %s and its one colour, as a catalogue spell does',
    (world, school) => {
      const line = `Grid collapse ×1 — ${SPELL.look} — ${school} school, its dominant colour electric blue #3B82F6`;
      expect(inventory(iconSet([customPick(SPELL)], world))).toContain(line);
    },
  );

  it('draws the look as written whatever the world, never handing the role to the world', () => {
    const typed = inventory(iconSet([customPick(RELIC)], 'Clockwork Moon Colony'));
    expect(typed).toContain(`Nightcity Keycard Relic ×1 — ${RELIC.look}`);
    expect(typed).not.toContain('would make it');
  });

  it('compiles a pair as one icon drawn in two states, naming each drawing', () => {
    const subject = iconSet([customPick(TOGGLE)]);
    expect(inventory(subject)).toContain(
      `Cloak field ×2, one icon drawn engaged and then idle — ${TOGGLE.look}`,
    );
    expect(slots(subject)).toEqual(['cloak-field-engaged', 'cloak-field-idle']);
  });

  it('rescues a hand the look names on every ICON sheet, and compiles the figure mark to nothing', () => {
    // The rescue sentences are unconditional on an ICON sheet, so they reach a custom look naming a
    // hand whether or not the entry is marked as showing a figure; no compiler code reads the mark.
    const marked = iconSet([customPick(SALUTE)]);
    const { figure: _mark, ...unmarkedSalute } = SALUTE;
    const unmarked = {
      ...marked,
      icons: {
        look: 'FULL_BLEED_TILE' as const,
        colourMode: 'FULL_COLOUR' as const,
        picks: [customPick(unmarkedSalute)],
      },
    };
    const sheet = generatePrompt('ICON', marked, { ...OUTPUT, sheetIndex: 0 });

    expect(flat(sectionOf(sheet, 'COMPONENT INVENTORY'))).toContain(`Gang salute ×1 — ${SALUTE.look}`);
    expect(flat(sectionOf(sheet, 'EXCLUSIONS'))).toContain(
      'A hand, face or figure an entry names is part of that icon’s subject and is drawn as the entry describes it.',
    );
    expect(flat(sheet)).toContain(
      'anatomy other than the hand, face or figure that is the subject of an icon’s own entry',
    );
    expect(generatePrompt('ICON', unmarked, { ...OUTPUT, sheetIndex: 0 })).toBe(sheet);
    // And on a sheet with no figure anywhere, the same sentences stand.
    const plain = generatePrompt('ICON', iconSet([customPick(RELIC)]), { ...OUTPUT, sheetIndex: 0 });
    expect(flat(sectionOf(plain, 'EXCLUSIONS'))).toContain('A hand, face or figure an entry names');
  });

  it('keeps a pair together where it would straddle two sheets, and counts it twice', () => {
    // Eight catalogue icons, the pair, seven more and a relic: eighteen drawings, which an even cut of
    // nine and nine would split the pair across, so the pair closes the first sheet at ten.
    const catalogue = singles(15);
    const subject = iconSet([
      ...catalogue.slice(0, 8),
      customPick(TOGGLE),
      ...catalogue.slice(8),
      customPick(RELIC),
    ]);
    const series = sheetSeriesFor('ICON', subject, OUTPUT.directionalMode, OUTPUT.directions);
    expect(series).toHaveLength(3);
    expect(slots(subject, 0)).toHaveLength(10);
    expect(slots(subject, 0).slice(8)).toEqual(['cloak-field-engaged', 'cloak-field-idle']);
    expect(slots(subject, 1)).toHaveLength(8);
    expect(slots(subject, 1).at(-1)).toBe('nightcity-keycard-relic');
  });

  it('throws on a citation a hand-built entry carries, which is why intake refuses one', () => {
    const hostile = { ...RELIC, look: 'a relic [SEC:X]' };
    expect(() =>
      generatePrompt('ICON', iconSet([customPick(hostile)]), { ...OUTPUT, sheetIndex: 0 }),
    ).toThrow(/\[SEC:X\]/);
  });

  it('never hands the compiler a stored entry citing a section', () => {
    const stored = hostileStoredSubject();
    const roster = parseIconRoster(
      typeof stored === 'object' && stored !== null && 'icons' in stored ? stored.icons : null,
      { look: 'FULL_BLEED_TILE', colourMode: 'FULL_COLOUR', picks: [] },
    );
    const subject = { ...iconSet([]), icons: roster };
    const prompts = sheetSeriesFor('ICON', subject, OUTPUT.directionalMode, OUTPUT.directions).map(
      (_plan, at) => generatePrompt('ICON', subject, { ...OUTPUT, sheetIndex: at }),
    );
    expect(prompts.join('\n')).not.toContain('[SEC:');
    expect(prompts.join('\n')).not.toContain('Hostile relic');
  });
});
