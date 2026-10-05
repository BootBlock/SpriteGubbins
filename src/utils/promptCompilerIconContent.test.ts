import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DAMAGE_SCHOOL_DEFINITIONS } from '../constants/iconCatalogue/damageSchools.ts';
import { ICON_CATALOGUE_GROUPS, iconCatalogueEntry } from '../constants/iconCatalogue/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import { sectionOf } from '../test/promptSections.ts';
import { ICON_LOOKS } from '../types/iconRoster.ts';
import type { IconLook } from '../types/iconRoster.ts';
import type { OutputConfig } from '../types/output.ts';
import type { SubjectDefinition } from '../types/subject.ts';
import { generatePrompt } from './promptCompiler.ts';
import { iconLookText } from './iconLookText.ts';
import { cataloguePicks } from '../constants/iconCatalogue/cataloguePicks.ts';

/**
 * The phase 4 content compiled: a spell sheet closing every line on its school and colour, and an
 * emote sheet whose every icon is a figure the exclusions, the guard and the audit let it draw.
 *
 * The catalogue's own suite holds each entry's words; this holds what the sheet makes of them, on the
 * target the maintainer's game sends its prompts to.
 */

const OUTPUT: OutputConfig = {
  ...DEFAULT_OUTPUT_CONFIG,
  directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
  targetModel: 'CHATGPT_5_6_SOL',
};

const flat = (text: string): string => text.replaceAll(/\s+/g, ' ');

/** The number a compiled prompt gives the section headed `title`, so a citation is checked exactly. */
function sectionNumber(prompt: string, title: string): string {
  const found = new RegExp(String.raw`^## (\d+)\. ${title}$`, 'm').exec(prompt)?.[1];
  if (found === undefined) throw new Error(`No section ${title}`);
  return found;
}

function groupIds(id: string): readonly string[] {
  const group = ICON_CATALOGUE_GROUPS.find((each) => each.id === id);
  if (group === undefined) throw new Error(`No group ${id}`);
  return group.entries.map((entry) => entry.id);
}

function iconSet(picks: readonly string[], look: IconLook, setting: string): SubjectDefinition {
  return {
    ...defaultSubjectFor('ICON'),
    setting,
    icons: { look, colourMode: 'FULL_COLOUR', picks: cataloguePicks(picks) },
  };
}

/** Every icon sheet a subject compiles to, the overlay sheet left out. */
function iconSheets(subject: SubjectDefinition, overrides: Partial<OutputConfig> = {}): readonly string[] {
  const series = sheetSeriesFor('ICON', subject, OUTPUT.directionalMode, OUTPUT.directions);
  return series
    .slice(1)
    .map((_plan, at) => generatePrompt('ICON', subject, { ...OUTPUT, ...overrides, sheetIndex: at + 1 }));
}

const THERMAL = groupIds('thermal-attacks');
const EMOTES = groupIds('emotes');

describe('a spell sheet in the compiled prompt', () => {
  it.each(['Near-Future Cyberpunk', 'High Fantasy', 'Clockwork Moon Colony'])(
    'closes every thermal attack on its school and its one colour under %s',
    (world) => {
      const subject = iconSet(THERMAL, 'FULL_BLEED_TILE', world);
      const [sheet] = iconSheets(subject);
      if (sheet === undefined) throw new Error('No icon sheet');
      const inventory = flat(sectionOf(sheet, 'COMPONENT INVENTORY'));
      const school = { 'Near-Future Cyberpunk': 'thermal', 'High Fantasy': 'fire' }[world] ?? 'thermal';

      for (const id of THERMAL) {
        const entry = iconCatalogueEntry(id);
        if (entry === undefined) throw new Error(`No entry ${id}`);
        const look = iconLookText(entry, world);
        expect(look.endsWith(`— ${school} school, its dominant colour orange #F97316`), id).toBe(true);
        expect(inventory, id).toContain(flat(`${entry.role} ×1 — ${look}`));
      }
    },
  );

  it.each(ICON_LOOKS)('keeps the colour-priority sentence on a %s spell sheet', (look) => {
    const [sheet] = iconSheets(iconSet(THERMAL, look, 'Near-Future Cyberpunk'));
    if (sheet === undefined) throw new Error('No icon sheet');
    // The school's colour is named by the entry, so this is what ranks it above the set's own.
    expect(flat(sheet)).toContain(
      'A colour an entry names is that icon’s own, and outranks the set’s primary and accent colours for it:',
    );
  });

  it('names a different school’s colour on each line of a mixed spell sheet', () => {
    const picks = ['kinetic-strike', 'cryo-strike', 'netrun-strike', 'nanite-strike'];
    const [sheet] = iconSheets(iconSet(picks, 'FULL_BLEED_TILE', 'Near-Future Cyberpunk'));
    if (sheet === undefined) throw new Error('No icon sheet');
    const inventory = flat(sectionOf(sheet, 'COMPONENT INVENTORY'));
    for (const school of ['KINETIC', 'CRYO', 'NETRUN', 'NANITE'] as const) {
      const { colourName, hex } = DAMAGE_SCHOOL_DEFINITIONS[school];
      expect(inventory).toContain(`its dominant colour ${colourName} ${hex}`);
    }
  });

  it('tells a fixed palette to answer the inventory’s colours as it answers the subject’s', () => {
    const [sheet] = iconSheets(iconSet(THERMAL, 'FULL_BLEED_TILE', 'Near-Future Cyberpunk'), {
      palette: 'PICO_8',
    });
    if (sheet === undefined) throw new Error('No icon sheet');
    const subject = sectionNumber(sheet, 'SUBJECT DEFINITION');
    const inventory = sectionNumber(sheet, 'COMPONENT INVENTORY');
    expect(flat(sheet)).toContain(
      `Where section ${subject} or section ${inventory} names a colour this block does not allow, use the nearest colour it does`,
    );
  });

  it.each(['SILHOUETTE_ONLY', 'CLAY_RENDER'] as const)(
    'lets a %s pass supersede the school colour a spell line names',
    (renderStyle) => {
      // The inventory outranks the set's colours, so a pass that superseded only section 1's would
      // lose to a spell's orange and deliver the finished sheet it was run instead of.
      const [sheet] = iconSheets(iconSet(THERMAL, 'FULL_BLEED_TILE', 'Near-Future Cyberpunk'), {
        renderStyle,
      });
      if (sheet === undefined) throw new Error('No icon sheet');
      const inventory = sectionNumber(sheet, 'COMPONENT INVENTORY');
      expect(flat(sectionOf(sheet, 'RENDER STYLE'))).toContain(
        `or an entry of the inventory in section ${inventory} does, this pass supersedes it`,
      );
      expect(flat(sheet)).toContain(
        `a pass that lost to the colours named above, or to a colour an entry in section ${inventory} names,`,
      );
    },
  );
});

describe('an emote sheet in the compiled prompt', () => {
  const subject = {
    ...iconSet(EMOTES, 'ISOLATED_MARK', 'Near-Future Cyberpunk'),
    exclusions: 'No hand or figure an icon’s entry does not name',
  };
  const sheets = iconSheets(subject);

  it('draws every emote, across the sheets the roster fills', () => {
    expect(sheets.length).toBe(2);
    const inventories = flat(sheets.map((sheet) => sectionOf(sheet, 'COMPONENT INVENTORY')).join(' '));
    for (const id of EMOTES) {
      const entry = iconCatalogueEntry(id);
      if (entry === undefined) throw new Error(`No entry ${id}`);
      expect(entry.figure, id).toBe(true);
      expect(inventories, id).toContain(flat(iconLookText(entry, subject.setting)));
    }
  });

  it.each([0, 1])('rescues the figure each entry names on icon sheet %i', (at) => {
    const sheet = sheets[at];
    if (sheet === undefined) throw new Error(`No icon sheet ${String(at + 1)}`);
    const exclusions = flat(sectionOf(sheet, 'EXCLUSIONS'));
    // The ban reaches only a hand or figure no entry names, and the rescue says an entry's own is drawn.
    expect(exclusions).toContain(
      `any hand, character or creature an entry in section ${sectionNumber(sheet, 'COMPONENT INVENTORY')} does not name`,
    );
    expect(exclusions).toContain(
      'A hand, face or figure an entry names is part of that icon’s subject and is drawn as the entry describes it.',
    );
    expect(exclusions).toContain('No hand or figure an icon’s entry does not name');
    // The guard leaves a figure that is an icon's subject alone, and the audit checks only what no
    // entry names.
    expect(flat(sheet)).toContain(
      'anatomy other than the hand, face or figure that is the subject of an icon’s own entry',
    );
    expect(flat(sectionOf(sheet, 'LAYOUT AND SELF-AUDIT'))).toContain(
      'no anatomy or figure its entry does not name',
    );
  });
});
