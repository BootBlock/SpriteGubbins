import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { ICON_SET_PRESETS } from '../constants/presets/iconSets.ts';
import { sectionOf } from '../test/promptSections.ts';
import { reachableSheets } from '../test/reachableSheets.ts';
import { generatePrompt } from './promptCompiler.ts';

/**
 * ICON's *Smallest Display Size* reaches section 2 as geometry (audit finding P6).
 *
 * It reached section 1 as a bare line and nothing else. The cyberpunk presets drew "Target component
 * size: 128 × 128 px per icon" for a 32 px display and were never told that is a reduction of four; the
 * default subject, drawn to a share of a cell, was held to "No feature smaller than 3 × 3 delivered
 * pixels" on cells two hundred pixels tall, and the sprite-scale bullets never fired for a 24 px icon.
 */

const DISPLAY_LINE = '- Smallest display size: ';
const styleOf = (prompt: string): string => sectionOf(prompt, 'RENDER STYLE');

function preset(id: string, sheetIndex: number): string {
  const found = ICON_SET_PRESETS.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`No icon preset ${id}.`);
  return generatePrompt('ICON', found.subject, { ...DEFAULT_OUTPUT_CONFIG, ...found.output, sheetIndex });
}

describe('the smallest display size in section 2', () => {
  it('states the reduction from the stated drawn size, in pixels, on every sheet of the set', () => {
    for (const sheetIndex of [0, 1]) {
      const style = styleOf(preset('cyberpunk-action-bar-consumables', sheetIndex));
      expect(style).toContain('- Target component size: 128 × 128 px per icon');
      expect(style).toContain(
        `${DISPLAY_LINE}Every component is shown as small as 32 × 32 px, 1/4 of the 128 × 128 px it is drawn at. No stroke, gap or accent is narrower than 8 delivered pixels`,
      );
    }
  });

  it('states the floor as a fraction of the square where no drawn size is stated', () => {
    const style = styleOf(
      generatePrompt('ICON', defaultSubjectFor('ICON'), { ...DEFAULT_OUTPUT_CONFIG, sheetIndex: 1 }),
    );
    expect(style).toContain(
      `${DISPLAY_LINE}Every component is shown as small as 24 × 24 px, so one displayed pixel is 1/24 of the width of the square it is drawn to.`,
    );
    // And the sprite-scale bullets fire on it, naming the size that fired them.
    expect(style).toContain('- The smallest display size above is sprite scale');
    expect(style).toContain('- Every component reads once reduced to its smallest display size.');
  });

  it('states nothing where the subject gives no size, or the drawing is shown at its own size', () => {
    const cleared = generatePrompt(
      'ICON',
      { ...defaultSubjectFor('ICON'), role: 'Tiny' },
      DEFAULT_OUTPUT_CONFIG,
    );
    expect(cleared).not.toContain(DISPLAY_LINE);
    // The pixel badges are drawn at 24 px and shown at 24 px: no reduction, and the target size's own
    // sprite-scale bullets stand.
    const badges = styleOf(preset('pixel-status-badge-set', 1));
    expect(badges).not.toContain(DISPLAY_LINE);
    expect(badges).toContain('- The target component size above is sprite scale');
  });

  // 30 seconds, as `tests/resolution-profile-fit.test.ts` budgets its own sweep: this compiles every
  // reachable sheet, and can run past the 5,000ms default under full-suite contention.
  it('reaches no category that declares no display size', () => {
    for (const { where, category, subject, output } of reachableSheets()) {
      if (category === 'ICON') continue;
      expect(generatePrompt(category, subject, output), where).not.toContain(DISPLAY_LINE);
    }
  }, 30_000);
});
