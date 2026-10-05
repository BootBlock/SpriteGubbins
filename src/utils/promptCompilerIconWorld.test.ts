import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import { sectionOf } from '../test/promptSections.ts';
import type { OutputConfig } from '../types/output.ts';
import type { SubjectDefinition } from '../types/subject.ts';
import { generatePrompt } from './promptCompiler.ts';

/**
 * That an icon line points at section 1's *World & Era* line only where section 1 has one (B1 of
 * `docs/todo/icon-set-audit.md`).
 *
 * A world no look family names hands each role to the world the reader typed, which section 1 states
 * word for word. A cleared world has no line there, since section 1 omits a cleared field, so an icon
 * told to follow “the stated World & Era” would follow nothing.
 */

const OUTPUT: OutputConfig = {
  ...DEFAULT_OUTPUT_CONFIG,
  directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
  targetModel: 'CHATGPT_5_6_SOL',
};

const flat = (text: string): string => text.replaceAll(/\s+/g, ' ');

/** The starter set's first icon sheet under `setting`: its subject section and its inventory. */
function firstIconSheet(setting: string): { readonly subject: string; readonly inventory: string } {
  const subject: SubjectDefinition = { ...defaultSubjectFor('ICON'), setting };
  expect(sheetSeriesFor('ICON', subject, OUTPUT.directionalMode, OUTPUT.directions).length).toBe(2);
  const sheet = generatePrompt('ICON', subject, { ...OUTPUT, sheetIndex: 0 });
  return {
    subject: flat(sectionOf(sheet, 'SUBJECT DEFINITION')),
    inventory: flat(sectionOf(sheet, 'COMPONENT INVENTORY')),
  };
}

describe('an icon sheet’s world in the compiled prompt', () => {
  it('names no world on any icon line when the World & Era is cleared', () => {
    const { subject, inventory } = firstIconSheet('');
    expect(subject).not.toContain('World & Era');
    expect(inventory).not.toContain('World & Era');
    expect(inventory).toContain(
      'Minor healing consumable ×1 — minor healing consumable, drawn in its most familiar form, from no particular world or era',
    );
  });

  it('hands each icon to a typed world section 1 states', () => {
    const { subject, inventory } = firstIconSheet('Dieselpunk Sky Pirates');
    expect(subject).toContain('World & Era: Dieselpunk Sky Pirates');
    expect(inventory).toContain('minor healing consumable, drawn as the stated World & Era would make it');
  });
});
