import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import type { IconColourMode } from '../types/iconRoster.ts';
import type { SubjectDefinition } from '../types/subject.ts';
import { outputForRoster } from './outputForRoster.ts';
import { cataloguePicks } from '../constants/iconCatalogue/cataloguePicks.ts';

/** An ICON subject holding `picks`: the overlay sheet, then one icon sheet per sixteen components. */
function iconSubject(
  picks: readonly string[],
  colourMode: IconColourMode = 'FULL_COLOUR',
): SubjectDefinition {
  return {
    ...defaultSubjectFor('ICON'),
    icons: { look: 'ISOLATED_MARK', colourMode, picks: cataloguePicks(picks) },
  };
}

describe('outputForRoster', () => {
  it('pulls an index past the series back to its last sheet', () => {
    const output = { ...DEFAULT_OUTPUT_CONFIG, sheetIndex: 4 };

    expect(outputForRoster('ICON', iconSubject(['heal-minor']), output).sheetIndex).toBe(1);
    expect(outputForRoster('ICON', iconSubject([]), output).sheetIndex).toBe(0);
  });

  it('hands back the same object where the series holds the index and the set can take the key', () => {
    const output = { ...DEFAULT_OUTPUT_CONFIG, sheetIndex: 1, backgroundKey: 'PURE_WHITE' } as const;

    expect(outputForRoster('ICON', iconSubject(['heal-minor']), output)).toBe(output);
  });

  it('moves a tint mask off the white key, and leaves every other key alone', () => {
    // A mask's lightest grey is the tint at full strength, close enough to white to be keyed out with it
    // (audit finding M1).
    const white = { ...DEFAULT_OUTPUT_CONFIG, sheetIndex: 1, backgroundKey: 'PURE_WHITE' } as const;
    const black = { ...white, backgroundKey: 'PURE_BLACK' } as const;
    const mask = iconSubject(['heal-minor'], 'TINT_MASK');

    expect(outputForRoster('ICON', mask, white)).toEqual({ ...white, backgroundKey: 'MAGENTA_FF00FF' });
    expect(outputForRoster('ICON', mask, black)).toBe(black);
  });

  it('moves a tint mask off a pinned palette, and leaves a full-colour set’s alone', () => {
    // A mask is drawn in neutral greys, which no pinned palette's hues can state (audit finding M1).
    const pinned = { ...DEFAULT_OUTPUT_CONFIG, sheetIndex: 1, palette: 'GAME_BOY_DMG' } as const;

    expect(outputForRoster('ICON', iconSubject(['heal-minor'], 'TINT_MASK'), pinned)).toEqual({
      ...pinned,
      palette: 'FREE',
    });
    expect(outputForRoster('ICON', iconSubject(['heal-minor']), pinned)).toBe(pinned);
  });
});
