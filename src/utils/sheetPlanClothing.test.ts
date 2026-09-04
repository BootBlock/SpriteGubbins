import { describe, expect, it } from 'vitest';
import { CATEGORY_DIRECTION_SETS } from '../constants/categoryDirectionSets.ts';
import {
  absentOptionFor,
  CATEGORY_OPTIONS,
  defaultSubjectFor,
  fieldLabelFor,
} from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { modesFor, sheetPlanFor, sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import { sectionOf } from '../test/promptSections.ts';
import { SUBJECT_CATEGORIES } from '../types/subject.ts';
import type { SubjectCategory } from '../types/subject.ts';
import { componentCountFor, planComponentCount } from './componentSet.ts';
import { componentSlots } from './componentSlots.ts';
import { generatePrompt } from './promptCompiler.ts';
import { declaresNoClothing, planAsDrawn, planDrawsClothing } from './sheetPlanClothing.ts';
import { slugify } from './slugify.ts';

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
 * **The pool's own `absentOption` is stepped over**, because it is a sentinel standing for "this
 * subject has none" rather than a description of anything, and every test above is about a subject
 * that *has* the attribute. Stepping over it is also what keeps those tests honest now that the value
 * takes the entries away: half the pools that declare one declare their *first* option, so a naive
 * `options[0]` would compile every BACKGROUND sheet with an inventory that no longer draws the thing
 * the assertion is about. The subject that does carry it has its own block below.
 */
function pooledClothing(category: SubjectCategory): string {
  const field = CATEGORY_OPTIONS[category].fields.find((option) => option.key === 'clothing');
  const absent = absentOptionFor(category, 'clothing');
  const value = field?.options.find((option) => option !== absent);
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
   * rather than separable from it. ITEM is the one whose guidance moved rather than its inventory:
   * an item is drawn stowed with whatever carries it, so its *Scabbard / Holster* shapes the design
   * without costing a component, and a reader who needs a separable carrier is sent to *Detachable
   * Parts*. See `sheetPlans/item.ts`.
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
    // carried one, so the guidance is what changed. Pinned because the content decision is what
    // holds it — the mechanism that once also forbade the entry no longer does, since the pool
    // declares its `absentOption` and an `'entirely'` entry would be dropped for the two shipped
    // presets that pin it.
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

describe('a subject that says it has none of the attribute', () => {
  /**
   * The pools that offer a value meaning *the subject has none of this*, pinned so the content
   * decision cannot drift.
   *
   * The five that do not are each a judgement rather than an oversight. Every option a CHARACTER's
   * *Clothing / Armour* offers is something the subject wears, an OBJECT on a *Freestanding Base* is
   * still mounted on something, and a BUILDING always carries some addon. **ICON and INTERFACE had
   * one and lost it**, which is the second of the two answers this change gives: an entry may only be
   * taken out where the reader declining the attribute gets a *plainer* sheet, and both of those
   * would have handed them an incomplete one. An icon sheet draws a disabled veil, a highlight halo
   * and four tier marks whatever is picked; a kit sheet draws the corner ornament the trim goes on,
   * and *Slice Assembly Base* offers a variant built around it. See `sheetPlans/icon.ts` and
   * `sheetPlans/interface.ts`.
   */
  const DECLARES_ABSENCE: Partial<Record<SubjectCategory, string>> = {
    BACKGROUND: 'Clear — No Overlay',
    CREATURE: 'NONE',
    EFFECT: 'No Secondary Layer',
    FONT: 'No Treatment',
    ITEM: 'NONE',
    PORTRAIT: 'Bare Shoulders',
    TERRAIN: 'Bare Untouched Ground',
    VEHICLE: 'Bare Unclad Frame',
  };

  it.each(SUBJECT_CATEGORIES)('%s declares the value its own pool offers, or none', (category) => {
    expect(absentOptionFor(category, 'clothing')).toBe(DECLARES_ABSENCE[category] ?? null);
  });

  it.each(SUBJECT_CATEGORIES)('orders no component a %s subject has just declined', (category) => {
    // The defect, swept: section 1 stated `Armour & Cladding: Bare Unclad Frame` while section 4
    // ordered `Cladding panel or fairing ×1` and closed by forbidding the generator to omit an
    // entry. Three of the four categories carrying it declared the absence by *default*, so this is
    // what a reader got before touching anything.
    const absent = absentOptionFor(category, 'clothing');
    if (absent === null) return;
    const label = fieldLabelFor(category, 'clothing');

    for (const { mode, directions, sheetIndex, plan } of sheetsOf(category)) {
      const prompt = generatePrompt(
        category,
        { ...defaultSubjectFor(category), clothing: absent },
        { ...DEFAULT_OUTPUT_CONFIG, directionalMode: mode, directions, sheetIndex },
      );
      const subjectSection = sectionOf(prompt, 'SUBJECT DEFINITION');
      const where = `${category} / ${mode} / ${directions} / sheet ${String(sheetIndex + 1)}`;

      // Section 1 still states the value — it is the subject's own answer — and stops excepting it
      // from the paint rule, because there is nothing left in section 4 for the exception to name.
      expect(subjectSection, where).toContain(`- ${label}: ${absent}`);
      expect(subjectSection.includes(`**${label}** is excepted`), where).toBe(false);

      // And the inventory carries none of the lines that drew it. Read off the *declared* plan, so
      // the assertion is against what the sheet used to ask for rather than against what it asks
      // for now — which is the only way round that can fail if the filter stops working.
      for (const group of plan.groups) {
        for (const entry of group.entries) {
          if (entry.drawsClothing === undefined) continue;
          expect(prompt, `${where} — ${entry.text}`).not.toContain(entry.text);
        }
      }
    }
  });

  it('takes the lines the report named, and leaves their neighbours', () => {
    // The worked example, because a sweep asserting an absence passes just as well on a prompt that
    // lost more than it should have. Each pair is one line that goes and one that stays in the same
    // group — the lamp housing beside the cladding panel — which is what VEHICLE's `Fittings:` line
    // was split apart for.
    const cases = [
      { category: 'VEHICLE', gone: 'Cladding panel', kept: 'Lamp housing' },
      { category: 'BACKGROUND', gone: 'Atmosphere veil', kept: 'Focal landmark' },
    ] as const;

    for (const { category, gone, kept } of cases) {
      const absent = absentOptionFor(category, 'clothing') ?? '';
      const chosen = defaultSubjectFor(category);
      const declined = generatePrompt(category, { ...chosen, clothing: absent }, DEFAULT_OUTPUT_CONFIG);

      // The kept line proves the fixture reaches the group at all: an assertion that a string is
      // absent from a prompt that never had it is unfalsifiable.
      expect(declined, `${category} kept ${kept}`).toContain(kept);
      expect(declined, `${category} dropped ${gone}`).not.toContain(gone);

      // And the same sheet compiled from any other value in the pool still draws it, which is what
      // makes the assertion above a statement about the reader's choice rather than about the plan.
      expect(
        generatePrompt(category, { ...chosen, clothing: pooledClothing(category) }, DEFAULT_OUTPUT_CONFIG),
        `${category} draws ${gone} for a subject that has one`,
      ).toContain(gone);
    }
  });

  it('counts, names and describes one sheet, never two', () => {
    // The three walks over a plan have to agree about which entries are on it: the count section 0
    // contracts for, the prose section 4 lists, and the slot names a manifest keys a sprite pack by.
    // A name list of a different length from the count maps every sprite after the divergence onto
    // the wrong component, which is the failure the whole arrangement is arranged against — and a
    // filter applied to two of the three would produce exactly that.
    for (const category of SUBJECT_CATEGORIES) {
      const absent = absentOptionFor(category, 'clothing');
      if (absent === null) continue;

      for (const { mode, directions, sheetIndex, plan } of sheetsOf(category)) {
        const count = componentCountFor(category, mode, directions, sheetIndex, absent, []);
        const names = componentSlots(category, mode, directions, sheetIndex, absent, []);
        const where = `${category} / ${mode} / ${directions} / sheet ${String(sheetIndex + 1)}`;

        expect(names, where).toHaveLength(count);
        expect(planComponentCount(planAsDrawn(plan, category, absent)), where).toBe(count);

        // And the sheet is still a sheet. `planAsDrawn` drops a group that has nothing left in it,
        // so a plan whose every entry drew the attribute would resolve to an inventory of nothing —
        // a prompt contracting for zero components, which every assertion below would pass. None of
        // the three plans this reaches is anywhere near that today; the claim is that the next one
        // cannot be.
        expect(planAsDrawn(plan, category, absent).groups.length, where).toBeGreaterThan(0);
        expect(count, where).toBeGreaterThan(0);

        const prompt = generatePrompt(
          category,
          { ...defaultSubjectFor(category), clothing: absent },
          { ...DEFAULT_OUTPUT_CONFIG, directionalMode: mode, directions, sheetIndex },
        );
        expect(prompt, where).toContain(`Exactly ${String(count)} components`);
        expect(prompt, where).toContain(`Component count is exactly ${String(count)}.`);
      }
    }
  });

  it('recognises the value however the reader typed it, and nothing beside it', () => {
    // The control is an unfiltered combo box, so the same choice arrives with a stray space or in
    // another case. What is deliberately *not* recognised is a sentence saying the same thing in the
    // reader's own words: telling that from `Reactive Armour Blocks` would take a guess, and a wrong
    // guess here takes components off a sheet somebody is about to pay a generation for.
    expect(declaresNoClothing('VEHICLE', 'Bare Unclad Frame')).toBe(true);
    expect(declaresNoClothing('VEHICLE', '  bare unclad frame ')).toBe(true);
    expect(declaresNoClothing('VEHICLE', 'No cladding at all')).toBe(false);
    expect(declaresNoClothing('VEHICLE', '')).toBe(false);
    // A category whose pool offers no such value cannot reach the filter at all, whatever is typed —
    // which is what ICON's own resolution rests on.
    expect(declaresNoClothing('ICON', 'No Overlay')).toBe(false);
  });

  it.each(SUBJECT_CATEGORIES)('gives %s no entry it can neither keep nor drop', (category) => {
    // The invariant that makes the arrangement complete rather than nearly complete. A `'partly'`
    // entry draws the attribute among other things — OBJECT's `Fittings: handle ×1, latch or catch
    // ×1, mounting bracket ×2` — so it cannot be dropped without taking a handle and a latch with
    // it, and cannot be kept without ordering a mounting bracket for a subject that has no mount. A
    // pool offering the absence beside a plan carrying such an entry is the original defect, and
    // the remedy is to split the line: VEHICLE's rig fittings and INTERFACE's trim both were.
    if (absentOptionFor(category, 'clothing') === null) return;

    for (const { mode, directions, sheetIndex, plan } of sheetsOf(category)) {
      for (const group of plan.groups) {
        for (const entry of group.entries) {
          expect(
            entry.drawsClothing,
            `${category} / ${mode} / ${directions} / sheet ${String(sheetIndex + 1)} — ${entry.text}`,
          ).not.toBe('partly');
        }
      }
    }
  });

  it.each(SUBJECT_CATEGORIES)('lets no other %s field name a component this one deletes', (category) => {
    // The defect this exists for, and the one the mechanism itself created. INTERFACE's
    // *Ornament & Trim* used to open with `Plain Untrimmed Edge`, so the untouched default deleted
    // the corner ornament — while *Slice Assembly Base* went on offering
    // `Nine-Slice With Fixed Corner Ornament`. Section 1 then named an assembly built around a
    // corner ornament and section 4 listed none: the same §1-names-it / §4-lacks-it contradiction
    // this whole change removes, moved to a different pair of fields and reachable without the
    // reader touching either control. Removing the pool value is what fixed it, and this is what
    // would have caught it.
    //
    // **Matched on the entry's label rather than its prose**, because the label is the identifier
    // the manifest and the sprite pack already key on, so a pool option that slugs to a string
    // containing it is naming that component rather than merely using the same English words.
    //
    // **`additional_anatomy` is exempt, and it is the reason the rule is safe to state this
    // strongly.** Naming a piece there *adds* it to the inventory and counts it — BACKGROUND's
    // *Extra Layers* offers `Drifting Cloud Wisp ×2, Sun Disc ×1`, which is the route back for a
    // reader who wants wisps on a clear scene, not a claim that the sheet already has them.
    const absent = absentOptionFor(category, 'clothing');
    if (absent === null) return;

    const deleted = new Set(
      sheetsOf(category).flatMap(({ plan }) =>
        plan.groups.flatMap((group) =>
          group.entries.filter((entry) => entry.drawsClothing === 'entirely').map((entry) => entry.label),
        ),
      ),
    );

    for (const field of CATEGORY_OPTIONS[category].fields) {
      if (field.key === 'clothing' || field.key === 'additional_anatomy') continue;
      for (const option of field.options) {
        for (const label of deleted) {
          expect(
            slugify(option).includes(label),
            `${category}.${field.key} offers “${option}”, which names the ${label} that ${absent} deletes`,
          ).toBe(false);
        }
      }
    }
  });
});
