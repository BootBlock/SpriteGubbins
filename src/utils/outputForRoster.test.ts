import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import type { IconColourMode } from '../types/iconRoster.ts';
import type { SubjectDefinition } from '../types/subject.ts';
import { outputForRoster } from './outputForRoster.ts';
import { cataloguePicks } from '../constants/iconCatalogue/cataloguePicks.ts';
import { ICON_CATALOGUE_GROUPS } from '../constants/iconCatalogue/index.ts';

/** An ICON subject holding `picks`: an icon sheet per sixteen components or part of it, then the overlay sheet. */
function iconSubject(
  picks: readonly string[],
  colourMode: IconColourMode = 'FULL_COLOUR',
  extras = 'NONE',
): SubjectDefinition {
  return {
    ...defaultSubjectFor('ICON'),
    additional_anatomy: extras,
    icons: { look: 'ISOLATED_MARK', colourMode, picks: cataloguePicks(picks) },
  };
}

/** `count` one-component catalogue ids, in catalogue order. */
function singles(count: number): readonly string[] {
  return ICON_CATALOGUE_GROUPS.flatMap((group) => group.entries)
    .filter((entry) => entry.states === undefined)
    .slice(0, count)
    .map((entry) => entry.id);
}

describe('outputForRoster', () => {
  it('pulls an icon sheet past the new series back to its last icon sheet', () => {
    // Forty icons are three icon sheets and the overlay sheet. A reader on the third icon sheet who
    // unticks down to one sheet's worth lands on that sheet, not on the overlay sheet behind it.
    const output = { ...DEFAULT_OUTPUT_CONFIG, sheetIndex: 2 };
    const before = iconSubject(singles(40));

    expect(outputForRoster('ICON', before, iconSubject(singles(10)), output).sheetIndex).toBe(0);
    expect(outputForRoster('ICON', before, iconSubject([]), output).sheetIndex).toBe(0);
  });

  it('keeps a reader on the overlay sheet there, however many sheets the roster now takes', () => {
    // The overlay sheet closes the series (audit finding T6), so it moves as the roster grows or shrinks.
    const before = iconSubject(singles(20));
    const onOverlay = { ...DEFAULT_OUTPUT_CONFIG, sheetIndex: 2 };

    expect(outputForRoster('ICON', before, iconSubject(singles(40)), onOverlay).sheetIndex).toBe(3);
    expect(outputForRoster('ICON', before, iconSubject(singles(10)), onOverlay).sheetIndex).toBe(1);
  });

  it('keeps a reader on the same overlay sheet where the extra pieces fill two', () => {
    // Ten extra pieces after the library's fourteen are two overlay sheets. Twenty icons are two icon
    // sheets, so the overlay sheets are the third and the fourth; forty icons are three, so the same two
    // overlay sheets become the fourth and the fifth.
    const extras = 'Equipped Corner Tick ×10';
    const before = iconSubject(singles(20), 'FULL_COLOUR', extras);
    const after = iconSubject(singles(40), 'FULL_COLOUR', extras);
    const onFirstOverlay = { ...DEFAULT_OUTPUT_CONFIG, sheetIndex: 2 };
    const onSecondOverlay = { ...DEFAULT_OUTPUT_CONFIG, sheetIndex: 3 };

    expect(outputForRoster('ICON', before, after, onFirstOverlay).sheetIndex).toBe(3);
    expect(outputForRoster('ICON', before, after, onSecondOverlay).sheetIndex).toBe(4);
    expect(outputForRoster('ICON', after, before, { ...onFirstOverlay, sheetIndex: 3 }).sheetIndex).toBe(2);
    // An icon sheet stays among the icon sheets rather than landing on the first overlay sheet.
    expect(outputForRoster('ICON', after, before, { ...onFirstOverlay, sheetIndex: 2 }).sheetIndex).toBe(1);
  });

  it('takes a reader from a set with no icons to its first icon sheet once they tick some', () => {
    // The overlay sheet alone is the whole series of an empty set, so the reader did not choose it.
    const empty = iconSubject([]);

    expect(outputForRoster('ICON', empty, iconSubject(singles(10)), DEFAULT_OUTPUT_CONFIG)).toBe(
      DEFAULT_OUTPUT_CONFIG,
    );
  });

  it('leaves a reader of a set with no icons where they are when they change its colour mode', () => {
    // Ten extra pieces fill a second overlay sheet, which is the second sheet of an empty set. A colour
    // mode chosen there ticks no icon, so it is no reason to move them to the first.
    const extras = 'Equipped Corner Tick ×10';
    const onSecondOverlay = { ...DEFAULT_OUTPUT_CONFIG, sheetIndex: 1 };
    const before = iconSubject([], 'FULL_COLOUR', extras);
    const after = iconSubject([], 'TINT_MASK', extras);

    expect(outputForRoster('ICON', before, after, onSecondOverlay).sheetIndex).toBe(1);
  });

  it('keeps a reader on an icon sheet among the icon sheets when a tick adds one', () => {
    const before = iconSubject(singles(20));
    const onIcons = { ...DEFAULT_OUTPUT_CONFIG, sheetIndex: 1 };

    expect(outputForRoster('ICON', before, iconSubject(singles(40)), onIcons)).toBe(onIcons);
  });

  it('hands back the same object where the series holds the index and the set can take the key', () => {
    const output = { ...DEFAULT_OUTPUT_CONFIG, sheetIndex: 1, backgroundKey: 'PURE_WHITE' } as const;
    const subject = iconSubject(['heal-minor']);

    expect(outputForRoster('ICON', subject, subject, output)).toBe(output);
  });

  it('moves a tint mask off the white key, and leaves every other key alone', () => {
    // A mask's lightest grey is the tint at full strength, close enough to white to be keyed out with it
    // (audit finding M1).
    const white = { ...DEFAULT_OUTPUT_CONFIG, sheetIndex: 1, backgroundKey: 'PURE_WHITE' } as const;
    const black = { ...white, backgroundKey: 'PURE_BLACK' } as const;
    const mask = iconSubject(['heal-minor'], 'TINT_MASK');

    expect(outputForRoster('ICON', mask, mask, white)).toEqual({ ...white, backgroundKey: 'MAGENTA_FF00FF' });
    expect(outputForRoster('ICON', mask, mask, black)).toBe(black);
  });

  it('moves a tint mask off a pinned palette, and leaves a full-colour set’s alone', () => {
    // A mask is drawn in neutral greys, which no pinned palette's hues can state (audit finding M1).
    const pinned = { ...DEFAULT_OUTPUT_CONFIG, sheetIndex: 1, palette: 'GAME_BOY_DMG' } as const;

    const mask = iconSubject(['heal-minor'], 'TINT_MASK');
    const full = iconSubject(['heal-minor']);

    expect(outputForRoster('ICON', mask, mask, pinned)).toEqual({
      ...pinned,
      palette: 'FREE',
    });
    expect(outputForRoster('ICON', full, full, pinned)).toBe(pinned);
  });
});
