import { describe, expect, it } from 'vitest';
import { CATEGORY_DIRECTION_SETS } from '../constants/categoryDirectionSets.ts';
import { defaultSubjectFor, fieldLabelFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { modesFor, sheetPlanFor, sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import { sectionOf } from '../test/promptSections.ts';
import { SUBJECT_CATEGORIES } from '../types/subject.ts';
import type { SubjectCategory } from '../types/subject.ts';
import { generatePrompt } from './promptCompiler.ts';
import { planDrawsClothing } from './sheetPlanClothing.ts';

/**
 * Section 1's paint rule against section 4's inventory, on every sheet the app can compile.
 *
 * The defect this suite exists for: section 1 closed with a sentence fixed in the template — every
 * fitted, applied and worn attribute is painted onto the component it sits on, and the
 * additional-anatomy field is "the single exception" — while seven categories draw their `clothing`
 * value as components in their own right. So a VEHICLE prompt said the cladding was paint and then
 * listed a cladding panel beside the hull; an ICON prompt said the overlay was paint and listed the
 * veil, the sweep and the flare. One prompt, contradicting itself, in the two sections that decide
 * what the sheet contains and how many components it has.
 *
 * It sweeps rather than sampling because the answer is a property of the *sheet*: BUILDING draws the
 * awning as a façade fitting on its module library and has no fitting at all on its directional
 * views or its tile set, so a check written against the category would be wrong on two of its three
 * plans whichever way it was written.
 */

/** Every (mode, direction set, sheet) address a category can be compiled at. */
function sheetsOf(category: SubjectCategory) {
  return modesFor(category).flatMap((mode) =>
    CATEGORY_DIRECTION_SETS[category].flatMap((directions) =>
      sheetSeriesFor(category, mode, directions).map((_, sheetIndex) => ({
        mode,
        directions,
        sheetIndex,
        plan: sheetPlanFor(category, mode, directions, sheetIndex),
      })),
    ),
  );
}

describe('section 1 excepts from its paint rule exactly what section 4 draws', () => {
  it.each(SUBJECT_CATEGORIES)('holds on every %s sheet', (category) => {
    const label = fieldLabelFor(category, 'clothing');

    for (const { mode, directions, sheetIndex, plan } of sheetsOf(category)) {
      const prompt = generatePrompt(
        category,
        // A value the category's own pool offers, so the line section 1 carries is one a reader
        // could actually have produced. The default is never `NONE` on the seven categories that
        // draw it, and the sentence is about the field rather than about any one value.
        { ...defaultSubjectFor(category), clothing: 'Fitted Test Layer' },
        { ...DEFAULT_OUTPUT_CONFIG, directionalMode: mode, directions, sheetIndex },
      );
      const subjectSection = sectionOf(prompt, 'SUBJECT DEFINITION');
      const where = `${category} / ${mode} / ${directions} / sheet ${String(sheetIndex + 1)}`;

      expect(subjectSection, where).toContain(`- ${label}: Fitted Test Layer`);
      expect(subjectSection.includes(`**${label}** is excepted`), where).toBe(planDrawsClothing(plan));
    }
  });

  it.each(SUBJECT_CATEGORIES)('says nothing about a %s clothing line nobody wrote', (category) => {
    // A cleared field emits no line, so an exception paragraph naming it would name an absent line
    // in the section the template calls the sole authority for the subject's design — the reason
    // the additional-anatomy paragraph is gated on its own rendered value rather than on the plan.
    const label = fieldLabelFor(category, 'clothing');

    for (const { mode, directions, sheetIndex } of sheetsOf(category)) {
      const prompt = generatePrompt(
        category,
        { ...defaultSubjectFor(category), clothing: '' },
        { ...DEFAULT_OUTPUT_CONFIG, directionalMode: mode, directions, sheetIndex },
      );
      const subjectSection = sectionOf(prompt, 'SUBJECT DEFINITION');

      expect(subjectSection).not.toContain(`- ${label}:`);
      expect(subjectSection).not.toContain(`**${label}** is excepted`);
    }
  });
});

describe('which categories draw the clothing value as components of their own', () => {
  /**
   * The content decision, pinned so it cannot drift back.
   *
   * Seven of the thirteen draw it: the *Armour & Cladding* a vehicle's hull is clad in, the
   * *Applied Overlay* an engine lays over any icon in the set, the *Applied Atmosphere* a
   * background scrolls at its own rate, the *Ornament & Trim* over an interface frame, the
   * *Awning & Addons* on a building's façade, the *Mounting / Framework* an object stands on, and
   * the *Scabbard / Holster* an item is stowed in. Every one of those fields says so in its own
   * guidance, and each is a piece an engine has a reason to composite or leave out.
   *
   * The other six are paint by their own guidance too: a character's clothing is "drawn into the
   * limb and torso surfaces", a font's applied treatment "goes into the glyph", and TERRAIN's
   * scatter layer and EFFECT's secondary layer both record having met this rule and restructured
   * their plans to obey it. PORTRAIT shows a collar inside a chest crop, and CREATURE's harness is
   * fitted to the animal rather than separable from it.
   */
  const DRAWN_SEPARATELY: readonly SubjectCategory[] = [
    'OBJECT',
    'ITEM',
    'BUILDING',
    'VEHICLE',
    'INTERFACE',
    'ICON',
    'BACKGROUND',
  ];

  it.each(SUBJECT_CATEGORIES)('%s', (category) => {
    const drawn = sheetsOf(category).some(({ plan }) => planDrawsClothing(plan));
    expect(drawn).toBe(DRAWN_SEPARATELY.includes(category));
  });

  it('gives an item’s carry piece somewhere to be drawn', () => {
    // The half of the defect that was a missing component rather than a wrong sentence: ITEM's field
    // guidance promised a sheath "emitted as its own component" and neither plan carried one, so a
    // reader who asked for a matched scabbard was told twice they would get one and handed a sheet
    // with nowhere for it. The part library is where it lives — see `sheetPlans/item.ts` for why the
    // directional core does not carry it.
    const partLibrary = sheetPlanFor('ITEM', 'SINGLE_DIRECTION_POSE_LIBRARY', 'FIVE_CLASSIC', 0);
    const entries = partLibrary.groups.flatMap((group) => group.entries);
    const carryPiece = entries.find((entry) => entry.drawsClothing === true);

    expect(carryPiece?.text).toBe('Scabbard, holster or carry piece ×1, drawn empty');
  });
});
