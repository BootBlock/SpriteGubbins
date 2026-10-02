import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import type { SubjectDefinition } from '../types/subject.ts';
import { sheetIndexWithinSeries } from './sheetIndexWithinSeries.ts';
import { cataloguePicks } from '../constants/iconCatalogue/cataloguePicks.ts';

/** An ICON subject holding `picks`: the overlay sheet, then one icon sheet per sixteen components. */
function iconSubject(picks: readonly string[]): SubjectDefinition {
  return { ...defaultSubjectFor('ICON'), icons: { look: 'ISOLATED_MARK', picks: cataloguePicks(picks) } };
}

describe('sheetIndexWithinSeries', () => {
  it('pulls an index past the series back to its last sheet', () => {
    const output = { ...DEFAULT_OUTPUT_CONFIG, sheetIndex: 4 };

    expect(sheetIndexWithinSeries('ICON', iconSubject(['heal-minor']), output).sheetIndex).toBe(1);
    expect(sheetIndexWithinSeries('ICON', iconSubject([]), output).sheetIndex).toBe(0);
  });

  it('hands back the same object where the series holds the index', () => {
    const output = { ...DEFAULT_OUTPUT_CONFIG, sheetIndex: 1 };

    expect(sheetIndexWithinSeries('ICON', iconSubject(['heal-minor']), output)).toBe(output);
  });
});
