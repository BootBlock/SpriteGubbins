import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import type { SubjectDefinition } from '../types/subject.ts';
import { sectionOf } from '../test/promptSections.ts';
import { generatePrompt } from './promptCompiler.ts';

/**
 * Section 7's glow and particle ban against what section 1 asks for (audit finding P7).
 *
 * The ban read "glow bleeding beyond a component’s silhouette, and any particle effect the inventory in
 * section 4 does not name", and section 7 overrules section 1 — so `Emissive Core Glow` was asked for
 * and then removed. The ban now excepts what section 1 names, keeps unasked-for glow out, and gives a
 * named glow the hard edge a cut-out needs.
 *
 * **Section 1's *Overlay Style* line is no licence on an icon sheet.** Section 1 says it is the style of
 * the pieces another sheet draws, and no icon here is drawn in it, so a licence reading the whole of
 * section 1 handed `Stepped Glow Bands` back to every icon.
 *
 * **On the overlay sheet it is the licence, beside the inventory** (audit finding O1). Section 1 there
 * describes the icons beneath apart from that line, which is the style every piece is drawn in, so a
 * style that names a glow is asked for and kept.
 */

const GLOWING = { ...defaultSubjectFor('ICON'), face_head: 'Emissive Core Glow' };
const OVERLAY_LINE_EXCEPTED =
  'that neither section 1, apart from its **Overlay Style** line, nor the inventory in section 4 names.';
const OVERLAY_LINE_LICENSED =
  'that neither the inventory in section 4 nor the **Overlay Style** line of section 1 names.';

/** Section 7, its lines joined, since where a sentence wraps is the template's business. */
function exclusionsOf(subject: SubjectDefinition, sheetIndex: number): string {
  const prompt = generatePrompt('ICON', subject, { ...DEFAULT_OUTPUT_CONFIG, sheetIndex });
  return sectionOf(prompt, 'EXCLUSIONS').replaceAll(/\s+/gu, ' ');
}

/** The overlay sheet's index: it closes an ICON series. */
function overlaySheetOf(subject: SubjectDefinition): number {
  return sheetSeriesFor('ICON', subject, 'SINGLE_DIRECTION_POSE_LIBRARY', 'SINGLE_FRONT').length - 1;
}

describe('the glow and particle exclusion', () => {
  it('excepts the glow and particles section 1 names on an icon sheet', () => {
    const exclusions = exclusionsOf(GLOWING, 0);
    expect(exclusions).toContain(OVERLAY_LINE_EXCEPTED);
    expect(exclusions).toContain('belongs to its component and ends at a hard edge with it');
    expect(exclusions).not.toContain('any particle effect the inventory in section 4 does not name');
  });

  it('gives no icon the glow of the overlay style Stepped Glow Bands, which another sheet draws in', () => {
    const subject = { ...defaultSubjectFor('ICON'), clothing: 'Stepped Glow Bands' };
    const prompt = generatePrompt('ICON', subject, { ...DEFAULT_OUTPUT_CONFIG, sheetIndex: 0 });
    expect(sectionOf(prompt, 'SUBJECT DEFINITION')).toContain('- Overlay Style: Stepped Glow Bands');
    expect(sectionOf(prompt, 'EXCLUSIONS').replaceAll(/\s+/gu, ' ')).toContain(OVERLAY_LINE_EXCEPTED);
  });

  it('licenses the whole of section 1 where it states no overlay style', () => {
    const exclusions = exclusionsOf({ ...GLOWING, clothing: '' }, 0);
    expect(exclusions).toContain('that neither section 1 nor the inventory in section 4 names.');
    expect(exclusions).not.toContain('apart from');
  });

  it('licenses the inventory and the overlay style on the overlay sheet, and nothing else of section 1', () => {
    const subject = { ...GLOWING, clothing: 'Stepped Glow Bands' };
    const exclusions = exclusionsOf(subject, overlaySheetOf(subject));
    expect(exclusions).toContain(OVERLAY_LINE_LICENSED);
    expect(exclusions).not.toContain('neither section 1');
  });

  it('licenses only the inventory on the overlay sheet where no overlay style is stated', () => {
    const subject = { ...GLOWING, clothing: '' };
    const exclusions = exclusionsOf(subject, overlaySheetOf(subject));
    expect(exclusions).toContain('that the inventory in section 4 does not name.');
    expect(exclusions).not.toContain('Overlay Style');
  });
});
