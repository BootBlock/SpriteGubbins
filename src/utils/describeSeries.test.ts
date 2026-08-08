import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DIRECTION_LISTS } from '../constants/promptText/index.ts';
import type { OutputConfig } from '../types/output.ts';
import { parseAdditionalAnatomy } from './additionalAnatomy.ts';
import { describeSeries } from './describeSeries.ts';
import { sheetBatch } from './sheetBatch.ts';

/**
 * The list section 6 carries when a configuration is more than one sheet.
 *
 * What it has to get right is the arithmetic per line: every sheet states *its own* component count,
 * because section 0 ranks the count first and a reader given the series' total would rank the wrong
 * number. The rest is legibility — one line per sheet, the current one marked exactly once.
 */
const NO_ANATOMY = parseAdditionalAnatomy(defaultSubjectFor('CHARACTER').additional_anatomy);

function withOutput(overrides: Partial<OutputConfig>): OutputConfig {
  return { ...DEFAULT_OUTPUT_CONFIG, ...overrides };
}

const EIGHT_WAY_RIG = withOutput({
  directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
  rigMode: 'CUTOUT_RIG',
  directions: 'EIGHT_COMPASS',
});

const TWO_SHEET_SERIES = withOutput({ directionalMode: 'CORE_DIRECTIONAL_VARIANTS' });

describe('describeSeries', () => {
  it('names every sheet, its own component count and the facings it draws', () => {
    // Both halves of what section 6 needs from the list: the counts say that the number section 0
    // contracts for is this sheet's alone, and the facings say which turns are somebody else's job.
    const batch = sheetBatch('CHARACTER', { ...TWO_SHEET_SERIES, sheetIndex: 1 });

    expect(describeSeries('CHARACTER', batch, NO_ANATOMY)).toBe(
      [
        '- **Sheet 1 — Directional core**: 15 components, covering front, front-three-quarter, right side, back-three-quarter, back.',
        '- **Sheet 2 — Articulation** *(this sheet)*: 34 components, drawn towards front.',
      ].join('\n'),
    );
  });

  it('marks exactly one line as this sheet, whichever facing of a run list it is', () => {
    for (const facing of DIRECTION_LISTS.EIGHT_COMPASS) {
      const batch = sheetBatch('CHARACTER', { ...EIGHT_WAY_RIG, primaryDirection: facing });
      const lines = describeSeries('CHARACTER', batch, NO_ANATOMY).split('\n');

      expect(lines, facing).toHaveLength(8);
      expect(
        lines.filter((line) => line.includes('*(this sheet)*')),
        facing,
      ).toHaveLength(1);
      expect(lines[batch.ordinal - 1], facing).toBe(
        `- **Sheet ${String(batch.ordinal)} — Rig pieces** *(this sheet)*: 15 components, drawn towards ${facing}.`,
      );
    }
  });

  it('counts the subject’s own anatomy onto the sheet that actually carries it', () => {
    // Additional anatomy lands on the first sheet of a series and is counted there, so a list that
    // ignored it would tell the reader of sheet one that its contract was three components lighter
    // than section 0 says.
    const anatomy = parseAdditionalAnatomy('Tail ×2, Wing ×1');
    const batch = sheetBatch('CHARACTER', TWO_SHEET_SERIES);
    const lines = describeSeries('CHARACTER', batch, anatomy).split('\n');

    expect(lines[0]).toContain('18 components');
    expect(lines[1]).toContain('34 components');
  });
});
