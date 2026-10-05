import { describe, expect, it } from 'vitest';
import { contradictionsIn } from '../constants/categories/exclusionElements.ts';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import type { SubjectDefinition } from '../types/subject.ts';
import { sectionOf } from '../test/promptSections.ts';
import { generatePrompt } from './promptCompiler.ts';

/**
 * Section 7's glow and particle ban against what section 1 asks for (audit finding P7).
 *
 * The ban read "glow bleeding beyond a component’s silhouette, and any particle effect the inventory in
 * section 4 does not name", and section 7 overrules section 1 — so `Elemental Wisps Around The Subject`,
 * `Neon Edge Light` and `Emissive Core Glow` were each asked for and then removed. The ban now excepts
 * what section 1 names, keeps unasked-for glow out, and gives a named glow the hard edge a cut-out needs.
 * On the overlay sheet section 1 describes the icons beneath, so only the inventory licenses a glow.
 *
 * **Section 1's *Applied Overlay* line is no licence on an icon sheet.** Section 1 says another sheet
 * draws the pieces that line governs and no icon here carries one, so a licence reading the whole of
 * section 1 handed `Rarity Glow & Aura` and `New Item Flare & Sparkle` back to every icon.
 */

const WISPS = { ...defaultSubjectFor('ICON'), face_head: 'Elemental Wisps Around The Subject' };
const OVERLAY_LINE_EXCEPTED =
  'that neither section 1, apart from its **Applied Overlay** line, nor the inventory in section 4 names.';

/** Section 7, its lines joined, since where a sentence wraps is the template's business. */
function exclusionsOf(subject: SubjectDefinition, sheetIndex: number): string {
  const prompt = generatePrompt('ICON', subject, { ...DEFAULT_OUTPUT_CONFIG, sheetIndex });
  return sectionOf(prompt, 'EXCLUSIONS').replaceAll(/\s+/gu, ' ');
}

describe('the glow and particle exclusion', () => {
  it('excepts the glow and particles section 1 names on an icon sheet', () => {
    const exclusions = exclusionsOf(WISPS, 1);
    expect(exclusions).toContain(OVERLAY_LINE_EXCEPTED);
    expect(exclusions).toContain('belongs to its component and ends at a hard edge with it');
    expect(exclusions).not.toContain('any particle effect the inventory in section 4 does not name');
  });

  it.each(['Rarity Glow & Aura', 'New Item Flare & Sparkle'])(
    'gives no icon the glow of the overlay style %s, which another sheet draws',
    (clothing) => {
      const prompt = generatePrompt(
        'ICON',
        { ...defaultSubjectFor('ICON'), clothing },
        {
          ...DEFAULT_OUTPUT_CONFIG,
          sheetIndex: 1,
        },
      );
      expect(sectionOf(prompt, 'SUBJECT DEFINITION')).toContain(`- Applied Overlay: ${clothing}`);
      expect(sectionOf(prompt, 'EXCLUSIONS').replaceAll(/\s+/gu, ' ')).toContain(OVERLAY_LINE_EXCEPTED);
    },
  );

  it('licenses the whole of section 1 where it states no overlay', () => {
    const exclusions = exclusionsOf({ ...WISPS, clothing: '' }, 1);
    expect(exclusions).toContain('that neither section 1 nor the inventory in section 4 names.');
    expect(exclusions).not.toContain('apart from');
  });

  it('licenses only the inventory on the overlay sheet, whose section 1 describes the icons beneath', () => {
    const exclusions = exclusionsOf(WISPS, 0);
    expect(exclusions).toContain('that the inventory in section 4 does not name.');
    expect(exclusions).not.toContain('neither section 1');
  });

  it('reports the pool’s own sparkle pair as a subject that cancels itself', () => {
    // `No motion lines or sparkle trail` against the overlay style `New Item Flare & Sparkle`.
    const subject = {
      ...defaultSubjectFor('ICON'),
      clothing: 'New Item Flare & Sparkle',
      exclusions: 'No motion lines or sparkle trail',
    };
    expect(contradictionsIn(subject).map(({ element, field }) => `${element}:${field}`)).toEqual([
      'sparkle:clothing',
    ]);
  });
});
