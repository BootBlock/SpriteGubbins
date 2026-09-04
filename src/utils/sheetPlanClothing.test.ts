import { describe, expect, it } from 'vitest';
import { CATEGORY_DIRECTION_SETS } from '../constants/categoryDirectionSets.ts';
import { CATEGORY_OPTIONS, defaultSubjectFor, fieldLabelFor } from '../constants/categories/index.ts';
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
 * additional-anatomy field is "the single exception" — while six categories draw their `clothing`
 * value as components in their own right. So a VEHICLE prompt said the cladding was paint and then
 * listed a cladding panel beside the hull, and an ICON prompt said the overlay was paint and listed
 * the veil, the sweep and the flare. One prompt, contradicting itself, in the two sections that
 * decide what the sheet contains and how many components it has.
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

/**
 * A value this category's own `clothing` pool offers, so the line section 1 carries is one a reader
 * could have produced by choosing rather than typing.
 *
 * `NONE` is stepped over because it is a sentinel standing for "this subject has none" rather than a
 * description of anything, and what these tests are about is the field.
 */
function pooledClothing(category: SubjectCategory): string {
  const field = CATEGORY_OPTIONS[category].fields.find((option) => option.key === 'clothing');
  const value = field?.options.find((option) => option !== 'NONE');
  if (value === undefined) throw new Error(`No clothing option for ${category}.`);
  return value;
}

describe('section 1 excepts from its paint rule exactly what section 4 draws', () => {
  it.each(SUBJECT_CATEGORIES)('holds on every %s sheet', (category) => {
    const label = fieldLabelFor(category, 'clothing');
    const clothing = pooledClothing(category);

    for (const { mode, directions, sheetIndex, plan } of sheetsOf(category)) {
      const prompt = generatePrompt(
        category,
        { ...defaultSubjectFor(category), clothing },
        { ...DEFAULT_OUTPUT_CONFIG, directionalMode: mode, directions, sheetIndex },
      );
      const subjectSection = sectionOf(prompt, 'SUBJECT DEFINITION');
      const where = `${category} / ${mode} / ${directions} / sheet ${String(sheetIndex + 1)}`;

      expect(subjectSection, where).toContain(`- ${label}: ${clothing}`);
      expect(subjectSection.includes(`**${label}** is excepted`), where).toBe(planDrawsClothing(plan));
    }
  });

  it.each(SUBJECT_CATEGORIES)('says nothing about a %s clothing line nobody wrote', (category) => {
    // A cleared field emits no line, so an exception paragraph naming it would name an absent line
    // in the section the template calls the sole authority for the subject's design — the reason the
    // additional-anatomy paragraph is gated on its own rendered value rather than on the plan.
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

  it.each(SUBJECT_CATEGORIES)(
    'states the paint rule on a %s sheet without promising anything',
    (category) => {
      // The rule has to stand on its own, because both paragraphs under it are gated. A first draft of
      // this change closed it with "… except where named below", which on 71 of the 118 sheets this app
      // can compile promised a named exception and named none — leaving "Do not infer props, weapons or
      // equipment from the role", the next line, as the only candidate for the exemption it had just
      // announced. The full stop is what makes the sentence true whether or not a paragraph follows.
      for (const { mode, directions, sheetIndex } of sheetsOf(category)) {
        for (const anatomy of ['', 'Extra Piece ×2']) {
          for (const clothing of ['', pooledClothing(category)]) {
            const prompt = generatePrompt(
              category,
              { ...defaultSubjectFor(category), clothing, additional_anatomy: anatomy },
              { ...DEFAULT_OUTPUT_CONFIG, directionalMode: mode, directions, sheetIndex },
            );
            const section = sectionOf(prompt, 'SUBJECT DEFINITION');
            const where = `${category} / ${mode} / sheet ${String(sheetIndex + 1)}`;

            expect(section, where).toContain('never drawn as a separate piece.\n');
          }
        }
      }
    },
  );
});

describe('which categories draw the clothing value as components of their own', () => {
  /**
   * The content decision, pinned so it cannot drift back.
   *
   * Six of the thirteen draw it: the *Armour & Cladding* a vehicle's hull is clad in, the *Applied
   * Overlay* an engine lays over any icon in the set, the *Applied Atmosphere* a background scrolls
   * at its own rate, the *Ornament & Trim* over an interface frame, the *Awning & Addons* on a
   * building's façade, and the *Mounting / Framework* an object stands on. Each is a piece an engine
   * has a reason to composite or to leave out, and each is one section 4 already listed.
   *
   * The other seven are paint: a character's clothing is "drawn into the limb and torso surfaces", a
   * font's applied treatment "goes into the glyph", and TERRAIN's scatter layer and EFFECT's
   * secondary layer both record having met this rule and restructured their plans to obey it.
   * PORTRAIT shows a collar inside a chest crop, and CREATURE's harness is fitted to the animal
   * rather than separable from it. ITEM is the one that turned on the inventory rather than on the
   * subject — its *Scabbard / Holster* pool offers `NONE` and a plan entry is unconditional, so an
   * entry would order a flat vector keycard an empty scabbard and count it. See `sheetPlans/item.ts`.
   */
  const DRAWN_SEPARATELY: readonly SubjectCategory[] = [
    'OBJECT',
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

  it('never orders a component for an item’s carry piece', () => {
    // The half of the defect that was a missing component rather than a wrong sentence, settled the
    // other way: ITEM's guidance promised a sheath "emitted as its own component" and neither plan
    // carried one. The two shipped presets that pin `NONE` — a flat vector keycard among them — are
    // why the inventory could not be the half that moved.
    for (const { plan } of sheetsOf('ITEM')) {
      for (const group of plan.groups) {
        for (const entry of group.entries) {
          expect(entry.text.toLowerCase()).not.toContain('scabbard');
          expect(entry.text.toLowerCase()).not.toContain('holster');
        }
      }
    }
  });
});
