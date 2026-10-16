import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import { sectionOf } from '../test/promptSections.ts';
import { reachableSheets } from '../test/reachableSheets.ts';
import type { SheetIdentity } from '../types/components.ts';
import type { IconLook } from '../types/iconRoster.ts';
import type { DirectionalMode, OutputConfig } from '../types/output.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';
import { generatePrompt } from './promptCompiler.ts';
import { sheetFacts } from './promptFacts.ts';

/**
 * What the identity-consistency section holds constant, stated for the kind of sheet it is.
 *
 * The section told every sheet its components were "the same single subject", holding silhouette,
 * colour blocking and material constant across them, and that a component on another sheet must
 * "read as the same object". An icon set's entries are different icons whose own colours outrank the
 * set's, and a font, a terrain blend set, a background and an interface kit are sets in the same way —
 * so the rule ordered every icon of a set drawn alike. A plan declares `SheetIdentity`, and these hold
 * the section to it on every sheet a reader can reach.
 */

const SUBJECT_RULE = `Every component belongs to the **same single subject**. Hold constant across all of them:
silhouette language and proportion · joint and attachment geometry · fitted and structural
regions · primary colour blocking · large identifying accents · material treatment.`;
const SET_RULE = 'Every component is a member of **one set**, not a part or a view of one subject';
const SET_DIFFERENCE = '**What tells one member from the next is never held constant**';
const LOCK = 'Palette: #112233';

/** What only a sheet of one subject's parts and views may be told by the identity section. */
const SUBJECT_ONLY = [
  'same single subject',
  'same object',
  'one-sided feature',
  'persistent three-dimensional form',
  'Where it fixes a side',
];

function identityOf(prompt: string): string {
  return sectionOf(prompt, 'IDENTITY CONSISTENCY');
}

function compiled(
  category: SubjectCategory,
  subject: SubjectDefinition,
  output: Partial<OutputConfig>,
): { readonly prompt: string; readonly name: string; readonly identity: SheetIdentity } {
  const full = { ...DEFAULT_OUTPUT_CONFIG, identityLock: LOCK, ...output };
  const { plan } = sheetFacts(category, subject, full);
  return { prompt: generatePrompt(category, subject, full), name: plan.name, identity: plan.identity };
}

function iconSubject(look: IconLook): SubjectDefinition {
  const subject = defaultSubjectFor('ICON');
  if (subject.icons === undefined) throw new Error('The ICON default should carry a roster.');
  return { ...subject, icons: { ...subject.icons, look } };
}

/** The first overlay sheet's index: the first sheet of the series that places its pieces in cells. */
function overlaySheetOf(subject: SubjectDefinition): number {
  const series = sheetSeriesFor('ICON', subject, 'SINGLE_DIRECTION_POSE_LIBRARY', 'SINGLE_FRONT');
  const index = series.findIndex((plan) => plan.placement !== undefined);
  if (index < 0) throw new Error('An ICON series should close with an overlay sheet.');
  return index;
}

/** A sheet of one set's members, with the plan name the compiler has to resolve for it. */
const SET_SHEETS: readonly (readonly [
  RegExp,
  SubjectCategory,
  SubjectDefinition,
  DirectionalMode,
  number,
])[] = [
  [/^Icons 1–\d+$/, 'ICON', iconSubject('FULL_BLEED_TILE'), 'SINGLE_DIRECTION_POSE_LIBRARY', 0],
  [
    /^Overlay pieces$/,
    'ICON',
    iconSubject('FULL_BLEED_TILE'),
    'SINGLE_DIRECTION_POSE_LIBRARY',
    overlaySheetOf(iconSubject('FULL_BLEED_TILE')),
  ],
  [/^Icons 1–\d+$/, 'ICON', iconSubject('ISOLATED_MARK'), 'SINGLE_DIRECTION_POSE_LIBRARY', 0],
  [
    /^Overlay pieces$/,
    'ICON',
    iconSubject('ISOLATED_MARK'),
    'SINGLE_DIRECTION_POSE_LIBRARY',
    overlaySheetOf(iconSubject('ISOLATED_MARK')),
  ],
  [/^Capitals$/, 'FONT', defaultSubjectFor('FONT'), 'SINGLE_DIRECTION_POSE_LIBRARY', 0],
  [/^Blend set$/, 'TERRAIN', defaultSubjectFor('TERRAIN'), 'TILESET_MODULAR', 0],
  [/^Parallax set$/, 'BACKGROUND', defaultSubjectFor('BACKGROUND'), 'TILESET_MODULAR', 0],
  [/^Layer library$/, 'BACKGROUND', defaultSubjectFor('BACKGROUND'), 'SINGLE_DIRECTION_POSE_LIBRARY', 0],
  [/^State library$/, 'INTERFACE', defaultSubjectFor('INTERFACE'), 'SINGLE_DIRECTION_POSE_LIBRARY', 0],
];

describe('identity consistency on a sheet of one set', () => {
  it.each(SET_SHEETS)(
    'holds a manner of drawing, never a design: %s (%s)',
    (name, category, subject, mode, at) => {
      const sheet = compiled(category, subject, { directionalMode: mode, sheetIndex: at });
      const identity = identityOf(sheet.prompt);

      expect(sheet.name).toMatch(name);
      expect(identity).toContain(SET_RULE);
      expect(identity).toContain(SET_DIFFERENCE);
      for (const phrase of SUBJECT_ONLY) expect(identity, phrase).not.toContain(phrase);
      // Section 1's lock sentence, which the lock every one of these carries prints.
      expect(sheet.prompt).not.toContain('same individual');
    },
  );

  it('carries a set across a series as a set, and cites the lock without a side to settle', () => {
    const { prompt } = compiled('ICON', iconSubject('ISOLATED_MARK'), {
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      sheetIndex: 1,
    });

    expect(identityOf(prompt)).toContain('read as a member of the same set');
    expect(identityOf(prompt)).toContain(
      'The identity lock in section 1 is the record of what the other sheets',
    );
    expect(prompt).toContain(
      'This sheet draws further members of the set a previously generated sheet drew.',
    );
  });
});

describe('identity consistency on a sheet of one subject', () => {
  it('keeps the subject rule, the series rule and the yaw rule for a character', () => {
    const output = { directionalMode: 'CORE_DIRECTIONAL_VARIANTS', directions: 'EIGHT_COMPASS' } as const;
    const { prompt, identity } = compiled('CHARACTER', defaultSubjectFor('CHARACTER'), output);
    const section = identityOf(prompt);

    expect(identity).toBe('ONE_SUBJECT');
    expect(section).toContain(SUBJECT_RULE);
    expect(section).toContain('read as the same object');
    expect(section).toContain(
      '**Which side of the subject each one-sided feature sits on is part of what has to match**',
    );
    expect(section).toContain('Where it fixes a side, that side is\nalready settled');
    expect(section).toContain('it is one persistent three-dimensional form');
    expect(section).not.toContain(SET_RULE);
    expect(prompt).toContain('This sheet depicts the same individual as a previously generated one.');
  });

  it('holds a nine-slice to one subject, being one frame cut into pieces', () => {
    const { prompt, name } = compiled('INTERFACE', defaultSubjectFor('INTERFACE'), {
      directionalMode: 'TILESET_MODULAR',
    });

    expect(name).toBe('Nine-slice set');
    expect(identityOf(prompt)).toContain(SUBJECT_RULE);
  });
});

const SHEETS = reachableSheets().map((sheet) => [sheet.where, sheet] as const);

describe('identity consistency on every reachable sheet', () => {
  it.each(SHEETS)('states the rule its plan declares, and only that one: %s', (where, sheet) => {
    const section = identityOf(generatePrompt(sheet.category, sheet.subject, sheet.output));
    const isSet = sheet.plan.identity === 'ONE_SET';

    expect(section.includes(SET_RULE), where).toBe(isSet);
    expect(section.includes(SUBJECT_RULE), where).toBe(!isSet);
  });
});
