import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { cataloguePicks } from '../constants/iconCatalogue/cataloguePicks.ts';
import { ICON_CATALOGUE_GROUPS } from '../constants/iconCatalogue/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import type { SubjectDefinition } from '../types/subject.ts';
import { outputForField } from './outputForField.ts';

/** An ICON subject of twenty one-component icons, two icon sheets, and these extra overlay pieces. */
function iconSubject(extras: string): SubjectDefinition {
  const picks = ICON_CATALOGUE_GROUPS.flatMap((group) => group.entries)
    .filter((entry) => entry.states === undefined)
    .slice(0, 20)
    .map((entry) => entry.id);
  return {
    ...defaultSubjectFor('ICON'),
    additional_anatomy: extras,
    icons: { look: 'ISOLATED_MARK', colourMode: 'FULL_COLOUR', picks: cataloguePicks(picks) },
  };
}

describe('outputForField', () => {
  it('pulls a reader back onto the last overlay sheet when the extra pieces no longer fill theirs', () => {
    // Ten extra pieces after the library's fourteen are a second overlay sheet, the fourth sheet of
    // the series. Removing them leaves three sheets, so the reader on the fourth lands on the third
    // rather than past the series.
    const filled = iconSubject('Equipped Corner Tick ×10');
    const output = { ...DEFAULT_OUTPUT_CONFIG, sheetIndex: 3 };

    expect(outputForField('ICON', filled, iconSubject('NONE'), output)?.sheetIndex).toBe(2);
  });

  it('keeps a reader on an icon sheet where the extra pieces add an overlay sheet', () => {
    const output = { ...DEFAULT_OUTPUT_CONFIG, sheetIndex: 1 };

    expect(outputForField('ICON', iconSubject('NONE'), iconSubject('Equipped Corner Tick ×10'), output)).toBe(
      null,
    );
  });

  it('answers nothing for an edit that moves no sheet', () => {
    const subject = defaultSubjectFor('CHARACTER');

    expect(
      outputForField('CHARACTER', subject, { ...subject, clothing: 'A long coat' }, DEFAULT_OUTPUT_CONFIG),
    ).toBe(null);
  });
});
