import { describe, expect, it } from 'vitest';
import { SUBJECT_CATEGORIES } from '../../types/subject.ts';
import type { SubjectCategory } from '../../types/subject.ts';
import { LETTERING_IS_A_COMPONENT } from '../promptText/exclusions.ts';
import { PROMPT_TEMPLATE } from '../promptTemplate.ts';
import {
  BAN_WORDS,
  FIELDS_NOT_READ,
  MARKING_SYNONYMS,
  letteringAskedFor,
  letteringTermIn,
  namesTerm,
} from './letteringMarks.ts';
import { CATEGORY_OPTIONS, defaultSubjectFor } from './index.ts';

/**
 * The lettering ban held against the pools that were asking for what it forbids.
 *
 * Nine options named unit numbers, serial numbers, chalked prices, a handwritten label, stencils and
 * graffiti while section 0 of their own compiled prompt banned every one of them — on VEHICLE's
 * default subject and on six shipped presets. The wording fix is one commit; what stops the tenth
 * option arriving the same way is this suite, which reads the pools rather than listing them. Two of
 * the nine were found by the sweep rather than by the report that asked for it.
 *
 * The preset half is in `presets/presets.test.ts`, where every per-preset assertion lives.
 */

/** Every option `category` offers in a field the ban is read against. */
function depictiveOptions(category: SubjectCategory): readonly string[] {
  return CATEGORY_OPTIONS[category].fields
    .filter((field) => !FIELDS_NOT_READ.includes(field.key))
    .flatMap((field) => field.options);
}

/**
 * Every option the sweep below actually reads.
 *
 * Deliberately the swept set rather than every option in the app: a carve-out is a claim about
 * something the check *would otherwise catch*, so one justified by an `exclusions` value or by a
 * FONT option would be vacuous in the way `Focal Glyph` was — the check never reaches either.
 */
const SWEPT_OPTIONS: readonly string[] = SUBJECT_CATEGORIES.filter(
  (category) => !LETTERING_IS_A_COMPONENT[category],
).flatMap((category) => depictiveOptions(category));

/** Every option any category's `exclusions` pool offers. */
const EXCLUSION_OPTIONS: readonly string[] = SUBJECT_CATEGORIES.flatMap(
  (category) => CATEGORY_OPTIONS[category].fields.find((field) => field.key === 'exclusions')?.options ?? [],
);

/**
 * The template's ban on lettering, as it reads for the twelve categories that carry it.
 *
 * Three blocks — section 0's output contract, section 8's exclusion list and section 9's self-audit.
 * A count below that means one of the three has been dropped or its condition renamed, which would
 * make the guard beneath it vacuous.
 */
const BAN_BLOCKS: readonly string[] = [
  ...PROMPT_TEMPLATE.matchAll(/\[IF:LETTERING_IS_A_COMPONENT!=yes\]([\s\S]*?)\[\/IF\]/gu),
].map(([, block]) => block ?? '');

/**
 * The nine options as they were written, kept because the sweep can no longer find them.
 *
 * Each is a real configuration the app shipped, so this is the regression the fix was for: a
 * rewording that also loosened the check would pass every other test in this file.
 * `Stencilled Cargo Panel` is the one that says why the endings are matched — a trailing-`s` match
 * reads `Stencils` and not the participle beside it.
 */
const RETIRED_MARKING_OPTIONS: readonly string[] = [
  'Unit Numbers & Roundels',
  'Hazard Stripes & Stencils',
  'Nose Art & Panel Graffiti',
  'Warning Stencils & LEDs',
  'Graffiti & Scratches',
  'Serial Numbers & Barcode',
  'Handwritten Apothecary Label',
  'Chalked Prices & Notices',
  'Stencilled Cargo Panel',
];

/**
 * Options that name a mark rather than the writing on it, and must keep being read that way.
 *
 * Every one is a live option, which the suite asserts rather than trusts — the first draft of this
 * list carried `Focal Glyph`, which is INTERFACE's field *label* and a string the sweep can never
 * reach, so that case proved nothing. Each stands on the distinction `letteringMarks.ts` draws: a
 * sign, a banner and a notice board are fittings that can be drawn blank, a barcode is a bar
 * pattern, a rune and a glyph are ornament, and a tally, a stamp and a brand are marks. A term list
 * that caught any of these would be unusable — it would fail the sheet on the mark the option exists
 * to draw.
 */
const MARKINGS_THAT_ARE_NOT_WRITING: readonly string[] = [
  'Swinging Inn Sign & Porch',
  'Overhanging Neon Signage & Pipes',
  'Neon Holographic Banner',
  'Holographic Vending Sign',
  'Hanging Sign Bracket & Lamp',
  'Signpost & Notice Board',
  'Barcode Brand On The Neck',
  'Runic Glyphs & Sigils',
  'Rune & Sigil Carving',
  'No Glyph — Blank Face',
  'Kill Tally Marks',
  'Maker’s Stamp & Guild Mark',
  'Branded Herd Tags',
];

describe('the words this check reads as lettering', () => {
  it('finds the template’s ban where the ban is stated', () => {
    expect(BAN_BLOCKS.length).toBe(3);
  });

  it.each(BAN_WORDS)('“%s” is a word the ban itself spells', (word) => {
    const blocks = BAN_BLOCKS.filter((block) => namesTerm(block, word));

    expect(blocks, `the template bans no “${word}”`).not.toEqual([]);
  });

  it.each(MARKING_SYNONYMS)('“%s” is a word the app writes for lettering', (word) => {
    // The ban is written in the vocabulary of annotation and the pools in the vocabulary of livery,
    // so a synonym is admissible on either of the two grounds — a pool banning lettering spells it,
    // or an option this change retired did.
    const banned = EXCLUSION_OPTIONS.some((option) => namesTerm(option, word));
    const retired = RETIRED_MARKING_OPTIONS.some((option) => namesTerm(option, word));

    expect(banned || retired, `nothing in the app writes “${word}”`).toBe(true);
  });

  it.each(RETIRED_MARKING_OPTIONS)('catches “%s”, which the app used to offer', (option) => {
    expect(letteringTermIn(option)).not.toBeUndefined();
  });

  it.each(MARKINGS_THAT_ARE_NOT_WRITING)('reads “%s” as a mark, not as writing', (option) => {
    expect(letteringTermIn(option)).toBeUndefined();
  });

  it.each(MARKINGS_THAT_ARE_NOT_WRITING)('is arguing about “%s”, which the app offers', (option) => {
    // What `Focal Glyph` failed. A carve-out for a string the sweep never reads defends nothing, and
    // reads in review as though the check had been held against a case it never sees.
    expect(SWEPT_OPTIONS).toContain(option);
  });

  it('matches a term through the endings a pool inflects it with', () => {
    // What the ending set buys, and the two live options that bound it. A pool writes a marking as a
    // participle at least as readily as a noun, and a trailing-`s` match reads `Stencils` while
    // walking straight past `Stencilled`. `Visible Brush Texture` and `Legendary` are live options
    // in categories the ban applies to, and `ure` and `ary` are the endings deliberately left out —
    // catching either would fail a sheet on nothing.
    expect(letteringTermIn('Stencilled Cargo Panel')).toBe('stencil');
    expect(letteringTermIn('Visible Brush Texture')).toBeUndefined();
    expect(letteringTermIn('Legendary')).toBeUndefined();
  });
});

describe('the options a category offers', () => {
  it('reads the pools it is meant to be reading', () => {
    // A walk that came back empty would make the sweep below vacuous, which is the shape a renamed
    // field key or a moved directory would take.
    for (const category of SUBJECT_CATEGORIES) {
      expect(depictiveOptions(category).length, `${category} offers no attributes`).toBeGreaterThan(0);
    }
  });

  it.each(SUBJECT_CATEGORIES)('%s asks for no lettering its own contract forbids', (category) => {
    if (LETTERING_IS_A_COMPONENT[category]) return;

    const asking = depictiveOptions(category)
      .map((option) => ({ option, term: letteringTermIn(option) }))
      .filter(({ term }) => term !== undefined)
      .map(({ option, term }) => `“${option}” asks for lettering (${term ?? ''})`);

    expect(asking, `${category} offers what section 0 bans`).toEqual([]);
  });

  it('lets FONT offer the lettering that is its own inventory', () => {
    // The exemption is what makes the sweep above a per-category claim rather than a global one, and
    // a FONT that stopped naming lettering would mean the exemption is covering nothing.
    const naming = depictiveOptions('FONT').filter((option) => letteringTermIn(option) !== undefined);

    expect(naming).not.toEqual([]);
  });
});

describe('the subject a category switch installs', () => {
  it.each(SUBJECT_CATEGORIES)('%s does not ask for what its own contract forbids', (category) => {
    // `defaultSubjectFor` takes the first option of all sixteen pools, so the pairing is a
    // consequence of pool order rather than anybody's choice — which is how `Unit Numbers &
    // Roundels`, the first entry of VEHICLE's markings pool, came to be the studio's opening subject.
    const asking = letteringAskedFor(category, defaultSubjectFor(category)).map(
      ({ field, value, term }) => `${field} “${value}” asks for lettering (${term})`,
    );

    expect(asking, `${category}’s default subject asks for banned lettering`).toEqual([]);
  });
});
