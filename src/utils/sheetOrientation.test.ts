import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { ICON_SET_PRESETS } from '../constants/presets/iconSets.ts';
import { PROJECTION_TEXT } from '../constants/promptText/index.ts';
import { sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import { sectionOf } from '../test/promptSections.ts';
import { reachableSheets } from '../test/reachableSheets.ts';
import { generatePrompt } from './promptCompiler.ts';

/**
 * How a sheet's components are oriented beneath its camera, stated for the kind of sheet it is
 * (`SheetPlan.orientation`).
 *
 * Section 3 held every icon at "object yaw 0° … both sides are edge-on" and called a component "turned
 * off it because the piece reads better that way" a defect, while ICON offers isometric and
 * three-quarter icon styles and a diagonal *Subject Framing*; it told an icon set which side of "the
 * subject" a one-sided feature sits on; and it gave the overlay pieces the icons' projection, so a
 * square ring came back an isometric diamond. These hold an icon sheet to a shared camera with each
 * subject posed for its own read, the overlay sheet to flat pieces under no camera, and every other
 * sheet to the section it always had (audit findings P2 and P3).
 */

const YAW_ONLY = [
  'object yaw 0°',
  '### The subject’s own left and right',
  'put it on the subject’s left',
  'Primary assembly direction',
  'Directions required',
  'reads better that way is a defect',
];
const SHARED_CAMERA = '**The camera is shared; the object’s yaw is not.**';
const FLAT = 'no projection or camera angle applies to it.';
const FLAT_AUDIT = 'Every component lies flat in the picture plane, square to the screen, at one scale';
const SQUARE_FLAT = 'Every square lies flat in the picture plane, square to the screen';
const YAW_PRECEDENCE =
  'the object orientation each component\nis asked for · the fixed camera, one scale and pivot compatibility';

/** A preset's first icon sheet, or its overlay sheet, which closes the series. */
function preset(id: string, sheet: 'ICONS' | 'OVERLAY'): string {
  const found = ICON_SET_PRESETS.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`No icon preset ${id}.`);
  const sheetIndex =
    sheet === 'ICONS'
      ? 0
      : sheetSeriesFor('ICON', found.subject, 'SINGLE_DIRECTION_POSE_LIBRARY', 'SINGLE_FRONT').length - 1;
  return generatePrompt('ICON', found.subject, { ...DEFAULT_OUTPUT_CONFIG, ...found.output, sheetIndex });
}

const ICON_SHEETS = [
  ['isometric-map-marker-set', 'TRUE_ISOMETRIC'],
  ['cyberpunk-action-bar-consumables', 'THREE_QUARTER_TOPDOWN'],
] as const;

describe('an icon sheet shares its camera and poses each subject for its own read', () => {
  it.each(ICON_SHEETS)('%s states the camera and no yaw', (id, projection) => {
    const prompt = preset(id, 'ICONS');
    const camera = sectionOf(prompt, 'PROJECTION, CAMERA AND OBJECT ORIENTATION');

    expect(camera).toContain(`- Projection: ${PROJECTION_TEXT[projection]}`);
    expect(camera).toContain(SHARED_CAMERA);
    expect(camera).toContain('laid diagonally across its cell');
    for (const phrase of YAW_ONLY) expect(prompt, phrase).not.toContain(phrase);
    expect(prompt).not.toContain('pivot compatibility');
    expect(prompt).toContain('the one camera and the one scale every component shares ·\nset identity ·');
  });

  it('audits one camera, and tells Sol to keep it rather than the object yaws', () => {
    const prompt = preset('cyberpunk-action-bar-consumables', 'ICONS');
    expect(prompt).toContain('One camera, one scale and one light direction across every component');
    expect(prompt).toContain('- the camera every component shares, as section 3 states it\n');
    expect(prompt).not.toContain('the object yaws in section');
    expect(prompt).not.toMatch(/drawn towards front/);
  });

  it('lays a full-bleed square flat whatever the camera, and audits it so', () => {
    const prompt = preset('cyberpunk-action-bar-consumables', 'ICONS');
    expect(prompt).toContain(SQUARE_FLAT);
    expect(prompt).toContain('Every square is level with the screen, never a diamond');
    expect(preset('isometric-map-marker-set', 'ICONS')).not.toContain(SQUARE_FLAT);
  });
});

describe('the overlay sheet draws flat pieces under no camera', () => {
  it.each(ICON_SHEETS)('%s states no projection for its pieces', (id, projection) => {
    const prompt = preset(id, 'OVERLAY');
    const camera = sectionOf(prompt, 'PROJECTION, CAMERA AND OBJECT ORIENTATION');

    expect(camera).toContain(FLAT);
    expect(camera).not.toContain('- Projection:');
    expect(prompt).not.toContain(PROJECTION_TEXT[projection]);
    expect(prompt).not.toContain('Camera elevation');
    for (const phrase of YAW_ONLY) expect(prompt, phrase).not.toContain(phrase);
    expect(prompt).toContain('every component lying flat in the picture plane, at one scale ·');
  });

  it('audits the flat pieces, and tells Sol to keep the rule', () => {
    const prompt = preset('cyberpunk-action-bar-consumables', 'OVERLAY');
    expect(sectionOf(prompt, 'LAYOUT AND SELF-AUDIT')).toContain(FLAT_AUDIT);
    expect(prompt).not.toContain('drawn through a camera that moved');
    expect(prompt).toContain('- section 3’s rule that every component lies flat in the picture plane\n');
    expect(prompt).not.toContain('the object yaws in section');
  });
});

describe('a sheet turned to its yaws keeps the camera section it had', () => {
  it('states the yaw, the sides and the precedence for a character', () => {
    const prompt = generatePrompt('CHARACTER', defaultSubjectFor('CHARACTER'), DEFAULT_OUTPUT_CONFIG);
    expect(prompt).toContain('### The subject’s own left and right');
    expect(prompt).toContain('- Primary assembly direction:');
    expect(prompt).toContain(`${YAW_PRECEDENCE} · subject identity`);
    expect(prompt).not.toContain(SHARED_CAMERA);
    expect(prompt).not.toContain(FLAT);
  });
});

const SHEETS = reachableSheets().map((sheet) => [sheet.where, sheet] as const);

describe('the camera section on every reachable sheet', () => {
  it.each(SHEETS)('states the orientation its plan declares, and only that one: %s', (where, sheet) => {
    const camera = sectionOf(
      generatePrompt(sheet.category, sheet.subject, sheet.output),
      'PROJECTION, CAMERA AND OBJECT ORIENTATION',
    );
    const { orientation } = sheet.plan;

    expect(camera.includes('- Primary assembly direction:'), where).toBe(orientation === 'SHEET_YAW');
    expect(camera.includes(SHARED_CAMERA), where).toBe(orientation === 'OWN_POSE');
    expect(camera.includes(FLAT), where).toBe(orientation === 'PICTURE_PLANE');
  });
});
