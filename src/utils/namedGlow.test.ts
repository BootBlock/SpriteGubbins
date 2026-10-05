import { describe, expect, it } from 'vitest';
import { contradictionsIn } from '../constants/categories/exclusionElements.ts';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
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
 */

const WISPS = { ...defaultSubjectFor('ICON'), face_head: 'Elemental Wisps Around The Subject' };
const exclusionsOf = (sheetIndex: number): string =>
  sectionOf(generatePrompt('ICON', WISPS, { ...DEFAULT_OUTPUT_CONFIG, sheetIndex }), 'EXCLUSIONS');

describe('the glow and particle exclusion', () => {
  it('excepts the glow and particles section 1 names on an icon sheet', () => {
    const exclusions = exclusionsOf(1);
    expect(exclusions).toContain('that neither section 1 nor the inventory in section 4 names.');
    expect(exclusions).toContain('belongs to its component and ends at a hard edge with it');
    expect(exclusions).not.toContain('any particle\n  effect the inventory in section 4 does not name');
  });

  it('licenses only the inventory on the overlay sheet, whose section 1 describes the icons beneath', () => {
    const exclusions = exclusionsOf(0);
    expect(exclusions).toContain('that the inventory in section 4 does not name.');
    expect(exclusions).not.toContain('neither section 1 nor');
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
