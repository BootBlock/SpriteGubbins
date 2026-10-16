import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG, OUTPUT_TOOLTIPS } from '../constants/output/index.ts';
import { ICON_SET_PRESETS } from '../constants/presets/iconSets.ts';
import { sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import { LIBRARY_OVERLAY_SHEETS } from '../test/libraryOverlaySheets.ts';
import { sectionOf } from '../test/promptSections.ts';
import { reachableSheets } from '../test/reachableSheets.ts';
import type { OutputConfig } from '../types/output.ts';
import { generatePrompt } from './promptCompiler.ts';

/**
 * What section 1 describes, stated for the kind of sheet it is (`SheetPlan.subjectScope`), and the
 * exceptions and exclusions that read it.
 *
 * Section 1 called itself "the sole authority for the subject's design" and ruled that a prop it does
 * not list "does not exist", above sixteen icons it does not list (P12). On the overlay sheet it listed
 * the icons' materials and colours and said each was "painted onto" the component it sits on, so a
 * cooldown wedge could come back in forged steel (P4). Its *Applied Overlay* exception said no icon
 * carries the overlay, against a padlock icon or a `Cracked & Failing` finish (P5). And section 7's
 * shadow ban left unclear whether a subject may shade its own full-bleed backdrop (P12).
 */

const SOLE_DESIGN = 'This section is the **sole authority** for the subject’s design.';
const SHARED = 'This section states what every member of the set shares';
const LAID_OVER = 'This section describes the set that the components on this sheet are laid over';
const PROPS = 'Do not infer props, weapons or equipment from the role';
const PAINTED = 'is **painted onto** the component it sits on';
const ALL_SHADOWS = '- All shadows: cast, contact, drop, and ambient occlusion onto the background.';
const OWN_SHADOW =
  'and a contact shadow it casts on the backdrop inside its\n  square, are part of its component';

/** A preset's first icon sheet, or its overlay sheet, which closes the series. */
function preset(id: string, sheet: 'ICONS' | 'OVERLAY', output: Partial<OutputConfig> = {}): string {
  const found = ICON_SET_PRESETS.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`No icon preset ${id}.`);
  const sheetIndex =
    sheet === 'ICONS'
      ? 0
      : sheetSeriesFor('ICON', found.subject, 'SINGLE_DIRECTION_POSE_LIBRARY', 'SINGLE_FRONT').length - 1;
  return generatePrompt('ICON', found.subject, {
    ...DEFAULT_OUTPUT_CONFIG,
    ...found.output,
    ...output,
    sheetIndex,
  });
}

const subjectOf = (prompt: string): string => sectionOf(prompt, 'SUBJECT DEFINITION');

describe('section 1 on the overlay sheet describes the icons beneath, never the pieces', () => {
  it('takes no material from the list, and colours a piece from its entry or the accent', () => {
    const section = subjectOf(preset('cyberpunk-action-bar-consumables', 'OVERLAY'));

    expect(section).toContain(LAID_OVER);
    expect(section).toContain('**describes none of these components**');
    expect(section).toContain(
      'drawn in the **Accent Colours** above, and in no other colour this list names.',
    );
    expect(section).toContain('It is lit under the lighting model section 2 states');
    for (const phrase of [SOLE_DESIGN, PAINTED, PROPS, 'Material descriptions define']) {
      expect(section, phrase).not.toContain(phrase);
    }
  });

  it('states no light for a piece where the style states none', () => {
    const section = subjectOf(
      preset('cyberpunk-action-bar-consumables', 'OVERLAY', { renderStyle: 'SILHOUETTE_ONLY' }),
    );
    expect(section).toContain(LAID_OVER);
    expect(section).not.toContain('It is lit under the lighting model');
  });

  it.each(Object.entries(LIBRARY_OVERLAY_SHEETS))('names a dark veil and sweep under %s', (_look, plan) => {
    // A piece whose entry names no colour or value takes the accent; a veil or a sweep in the accent
    // colour would light up the icon it is meant to dim.
    const texts = plan.groups
      .flatMap((group) => group.entries)
      .map((entry) => `${entry.label}: ${entry.text}`);
    expect(texts.find((text) => text.startsWith('disabled-veil'))).toContain('dark');
    expect(texts.find((text) => text.startsWith('cooldown-sweep'))).toContain('dark');
  });
});

describe('section 1 on an icon sheet states what the set shares', () => {
  it('names each entry as its icon’s design, and infers nothing about props from a display size', () => {
    const section = subjectOf(preset('cyberpunk-action-bar-consumables', 'ICONS'));
    expect(section).toContain(SHARED);
    expect(section).toContain('the entry wins for that member');
    expect(section).toContain(PAINTED);
    expect(section).not.toContain(SOLE_DESIGN);
    expect(section).not.toContain(PROPS);
  });

  it('keeps the overlay’s pieces off the icons, but never an element an icon asks for itself', () => {
    const section = subjectOf(preset('cyberpunk-action-bar-consumables', 'ICONS'));
    const flat = section.replaceAll(/\s+/gu, ' ');
    expect(flat).toContain('no component on this sheet is drawn in it or carries one of those pieces.');
    expect(flat).toContain('is part of that component and is drawn, however closely it resembles');
    expect(section).not.toContain('component on this sheet carries it.');
  });
});

describe('section 7 on a full-bleed sheet', () => {
  it('lets a subject shade its own square, and nothing fall on the gutters', () => {
    const squares = sectionOf(preset('cyberpunk-action-bar-consumables', 'ICONS'), 'EXCLUSIONS');
    const marks = sectionOf(preset('isometric-map-marker-set', 'ICONS'), 'EXCLUSIONS');

    expect(squares).toContain(OWN_SHADOW);
    expect(squares).toContain('nothing is cast, dropped or occluded onto the gutters');
    expect(squares).not.toContain(ALL_SHADOWS);
    expect(marks).toContain(ALL_SHADOWS);
    expect(marks).not.toContain(OWN_SHADOW);
  });
});

describe('the identity lock on a set', () => {
  it('ranks set identity on a sheet of one set, and subject identity on one subject', () => {
    expect(generatePrompt('FONT', defaultSubjectFor('FONT'), DEFAULT_OUTPUT_CONFIG)).toContain(
      '· set identity ·',
    );
    expect(generatePrompt('CHARACTER', defaultSubjectFor('CHARACTER'), DEFAULT_OUTPUT_CONFIG)).toContain(
      '· subject identity ·',
    );
  });

  it('promises a match for a subject or a set in its tooltip, never the same individual', () => {
    expect(OUTPUT_TOOLTIPS.identityLock).not.toContain('same individual');
    expect(OUTPUT_TOOLTIPS.identityLock).toContain('members of the same set');
    expect(OUTPUT_TOOLTIPS.sheetIndex).not.toContain('same individual');
  });
});

const SHEETS = reachableSheets().map((sheet) => [sheet.where, sheet] as const);

describe('section 1 on every reachable sheet', () => {
  it.each(SHEETS)('opens on the scope its plan declares, and only that one: %s', (where, sheet) => {
    const section = subjectOf(generatePrompt(sheet.category, sheet.subject, sheet.output));
    const { subjectScope } = sheet.plan;

    expect(section.includes(SOLE_DESIGN), where).toBe(subjectScope === 'ONE_DESIGN');
    expect(section.includes(SHARED), where).toBe(subjectScope === 'SHARED_BY_SET');
    expect(section.includes(LAID_OVER), where).toBe(subjectScope === 'LAID_OVER');
  });
});
