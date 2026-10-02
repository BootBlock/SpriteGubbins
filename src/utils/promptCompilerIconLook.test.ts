import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import { sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import { everySheetOf } from '../test/categoryProse.ts';
import { renderContractOf, sectionOf } from '../test/promptSections.ts';
import { ICON_LOOKS } from '../types/iconRoster.ts';
import type { IconLook } from '../types/iconRoster.ts';
import type { OutputConfig } from '../types/output.ts';
import { SUBJECT_CATEGORIES } from '../types/subject.ts';
import type { SubjectDefinition } from '../types/subject.ts';
import { generatePrompt } from './promptCompiler.ts';

/**
 * The full-bleed square against the isolated mark, compiled (R5, R13 of `docs/todo/icon-catalogue.md`).
 *
 * The look reaches the prompt in five places — section 0's background item and the self-audit's check
 * on it, the icon sheet's own prose, ICON's exclusion and audit lines, and two wrappers' negatives — and
 * this suite holds them to one answer per sheet: every one of them on a full-bleed icon sheet, none on
 * the overlay sheet or an isolated set, and none on any other category's sheets.
 */

const OUTPUT: OutputConfig = { ...DEFAULT_OUTPUT_CONFIG, directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY' };
const ICON = defaultSubjectFor('ICON');

function iconSet(look: IconLook): SubjectDefinition {
  return { ...ICON, icons: { look, picks: ICON.icons?.picks ?? [] } };
}

/** The ICON prompt for one sheet of a set in `look` — sheet 0 is the overlay sheet, sheet 1 the icons. */
function iconPrompt(look: IconLook, sheetIndex: number, overrides: Partial<OutputConfig> = {}): string {
  return generatePrompt('ICON', iconSet(look), { ...OUTPUT, ...overrides, sheetIndex });
}

const flat = (text: string): string => text.replaceAll(/\s+/g, ' ');

/** Section 0's sentence handing the backdrop to the component, and the self-audit's check on it. */
const CONTRACT_BACKDROP = 'and that backdrop belongs to the component, not to the background';
const AUDIT_BACKDROP = 'Every component is a square painted to its edge, backdrop included';

describe('the full-bleed icon square in the compiled prompt', () => {
  it('hands each square its own backdrop in section 0, and the gutters to the key', () => {
    const contract = flat(renderContractOf(iconPrompt('FULL_BLEED_TILE', 1)));
    expect(contract).toContain(CONTRACT_BACKDROP);
    expect(contract).toContain(
      'the background is only the gutters between the squares, so flat magenta #FF00FF fills those gutters and never shows inside a square',
    );
  });

  it('names a transparent field by what it is, never as a colour', () => {
    const contract = flat(
      renderContractOf(iconPrompt('FULL_BLEED_TILE', 1, { backgroundKey: 'TRANSPARENT' })),
    );
    expect(contract).toContain('so fully transparent alpha fills those gutters');
  });

  it.each(ICON_LOOKS)('states the contract and the audit together or not at all on a %s set', (look) => {
    for (const sheetIndex of [0, 1]) {
      const prompt = iconPrompt(look, sheetIndex);
      const contract = renderContractOf(prompt).includes(CONTRACT_BACKDROP);
      const audit = flat(sectionOf(prompt, 'LAYOUT AND SELF-AUDIT')).includes(AUDIT_BACKDROP);
      expect(audit).toBe(contract);
      expect(contract).toBe(look === 'FULL_BLEED_TILE' && sheetIndex === 1);
    }
  });

  it('swaps the ban on backgrounds for a ban on scenery beyond the square, on the icon sheet alone', () => {
    const squares = flat(sectionOf(iconPrompt('FULL_BLEED_TILE', 1), 'EXCLUSIONS'));
    const marks = flat(sectionOf(iconPrompt('ISOLATED_MARK', 1), 'EXCLUSIONS'));
    const overlay = flat(sectionOf(iconPrompt('FULL_BLEED_TILE', 0), 'EXCLUSIONS'));

    expect(squares).not.toContain('Backgrounds, environments');
    expect(squares).toContain('any scenery beyond a square’s own backdrop');
    expect(squares).toContain(
      'anything crossing a square’s edge, and any frame, border or bevel drawn along it',
    );
    expect(squares).toContain('A square’s own backdrop of colour, light and texture is part of its icon');
    for (const prose of [marks, overlay]) {
      expect(prose).toContain('Backgrounds, environments, ground planes');
      expect(prose).not.toContain('backdrop');
    }
  });

  it('audits the squares against each other on a full-bleed icon sheet', () => {
    const audit = flat(sectionOf(iconPrompt('FULL_BLEED_TILE', 1), 'LAYOUT AND SELF-AUDIT'));
    expect(audit).toContain('nothing crossing its square’s edge');
    expect(audit).toContain(
      'Every square is the same size, and every subject fills its square to the same margin',
    );
    expect(audit).not.toContain('Every icon fills the same cell');
  });

  it('shapes the overlay pieces to the square of a tile under the full-bleed look only', () => {
    const squares = flat(sectionOf(iconPrompt('FULL_BLEED_TILE', 0), 'COMPONENT INVENTORY'));
    const marks = flat(sectionOf(iconPrompt('ISOLATED_MARK', 0), 'COMPONENT INVENTORY'));
    expect(squares).toContain('a dark wedge clipped to the tile’s square');
    expect(marks).toContain('Cooldown sweep ×2: a quarter elapsed, and three quarters');
    expect(marks).not.toContain('square');
  });

  it('never opens the backdrop gate on another category’s sheets', () => {
    for (const category of SUBJECT_CATEGORIES.filter((candidate) => candidate !== 'ICON')) {
      expect(everySheetOf(category).filter((plan) => plan.backdrop !== undefined)).toEqual([]);
    }
    // And compiled, on a figure and on a ground tile — the category whose tiles are also painted to
    // their edge, and which `SheetPlan.backdrop` records as declining it.
    for (const [category, subject] of [
      [DEFAULT_PRESET.category, DEFAULT_PRESET.subject],
      ['TERRAIN', defaultSubjectFor('TERRAIN')],
    ] as const) {
      const prompt = generatePrompt(category, subject, DEFAULT_OUTPUT_CONFIG);
      expect(prompt).not.toContain(CONTRACT_BACKDROP);
      expect(prompt).not.toContain(AUDIT_BACKDROP);
    }
  });
});

describe('the full-bleed icon square in the wrappers', () => {
  it.each(['QWEN_IMAGE', 'STABLE_DIFFUSION'] as const)(
    'drops `gradient background` from %s only where the sheet carries its own backdrop',
    (targetModel) => {
      expect(iconPrompt('FULL_BLEED_TILE', 1, { targetModel })).not.toContain('gradient background');
      expect(iconPrompt('FULL_BLEED_TILE', 1, { targetModel })).toContain('scene background');
      expect(iconPrompt('FULL_BLEED_TILE', 0, { targetModel })).toContain('gradient background');
      expect(iconPrompt('ISOLATED_MARK', 1, { targetModel })).toContain('gradient background');
      expect(
        generatePrompt(DEFAULT_PRESET.category, DEFAULT_PRESET.subject, {
          ...DEFAULT_OUTPUT_CONFIG,
          targetModel,
        }),
      ).toContain('gradient background');
    },
  );

  it.each(ICON_LOOKS)('has Sol carry every %s inventory entry and the backdrop rule unshortened', (look) => {
    const prompt = iconPrompt(look, 1, { targetModel: 'CHATGPT_5_6_SOL' });
    const directive = prompt.slice(0, prompt.indexOf('# MODULAR SPRITE-SHEET SPECIFICATION'));
    expect(directive).toMatch(/- the numbered items of section 0\n/);
    expect(directive).toMatch(/- the inventory in section \d+\n/);

    const [, sheet] = sheetSeriesFor('ICON', iconSet(look), 'SINGLE_DIRECTION_POSE_LIBRARY', 'SINGLE_FRONT');
    const inventory = sectionOf(prompt, 'COMPONENT INVENTORY');
    const entries = sheet?.groups.flatMap((group) => group.entries) ?? [];
    expect(entries).toHaveLength(16);
    for (const entry of entries) expect(inventory).toContain(`- ${entry.text}`);
    // The backdrop rule sits among the numbered items the directive protects, not in prose Sol may cut.
    expect(renderContractOf(prompt).includes(CONTRACT_BACKDROP)).toBe(look === 'FULL_BLEED_TILE');
  });
});
