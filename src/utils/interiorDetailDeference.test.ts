import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import { sectionOf } from '../test/promptSections.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';
import { generatePrompt } from './promptCompiler.ts';

/**
 * Section 2 defers to the interior-detail treatment the subject states (audit finding P11).
 *
 * Its surface-detail level spoke of "major panels and folds" and "essential joints only", and the pixel
 * discipline banned "etched strokes" and "crosshatching" — under ICON's `Flat Fill, No Interior Detail`,
 * `Etched Engraved Lines` and `Hatched Line Shading`. Where a category declares an `INTERIOR_DETAIL` field
 * and the subject states it, the level defers to it, and a line technique it names is excepted by name.
 */

const DEFERS = 'Inside each form, the **Interior Detail** section 1 states decides what is drawn';
const EXCEPTED = 'is excepted from that ban';

function styleOf(category: SubjectCategory, subject: SubjectDefinition, sheetIndex = 0): string {
  const output = { ...DEFAULT_OUTPUT_CONFIG, renderStyle: 'PIXEL_ART' as const, sheetIndex };
  return sectionOf(generatePrompt(category, subject, output), 'RENDER STYLE');
}

/** The overlay sheet's index: it closes an ICON series. */
function overlaySheetOf(subject: SubjectDefinition): number {
  return sheetSeriesFor('ICON', subject, 'SINGLE_DIRECTION_POSE_LIBRARY', 'SINGLE_FRONT').length - 1;
}

describe('the surface-detail level beside a stated interior detail', () => {
  it('defers to it on an icon sheet and a font sheet', () => {
    expect(styleOf('ICON', defaultSubjectFor('ICON'))).toContain(DEFERS);
    expect(styleOf('FONT', defaultSubjectFor('FONT'))).toContain(DEFERS);
  });

  it('excepts a line technique the subject names from the microtexture ban, by name', () => {
    for (const [category, worn] of [
      ['ICON', 'Etched Engraved Lines'],
      ['ICON', 'Hatched Line Shading'],
      ['FONT', 'Etched Engraved Channels'],
    ] as const) {
      const style = styleOf(category, { ...defaultSubjectFor(category), worn_details: worn });
      expect(style, worn).toContain(`- *${worn}*, the **Interior Detail** section 1 states, ${EXCEPTED}`);
    }
    // A treatment that is not a line technique, or one typed, leaves the ban as written.
    expect(styleOf('ICON', defaultSubjectFor('ICON'))).not.toContain(EXCEPTED);
    expect(styleOf('ICON', { ...defaultSubjectFor('ICON'), worn_details: 'Scratchy lines' })).not.toContain(
      EXCEPTED,
    );
  });

  it('says nothing on the overlay sheet, whose section 1 describes the icons beneath', () => {
    const subject = { ...defaultSubjectFor('ICON'), worn_details: 'Etched Engraved Lines' };
    const style = styleOf('ICON', subject, overlaySheetOf(subject));
    expect(style).not.toContain(DEFERS);
    expect(style).not.toContain(EXCEPTED);
  });

  it('says nothing where the field is cleared, or the category’s field is a set of marks', () => {
    expect(styleOf('ICON', { ...defaultSubjectFor('ICON'), worn_details: '' })).not.toContain(DEFERS);
    for (const category of ['CHARACTER', 'OBJECT', 'TERRAIN'] as const) {
      expect(styleOf(category, defaultSubjectFor(category)), category).not.toContain(DEFERS);
    }
  });
});
