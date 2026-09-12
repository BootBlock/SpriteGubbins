import { describe, expect, it } from 'vitest';
import { CATEGORY_DIRECTION_SETS } from '../src/constants/categoryDirectionSets.ts';
import { CATEGORY_OPTIONS, defaultSubjectFor } from '../src/constants/categories/index.ts';
import {
  ASSEMBLY_BASE_ADDS_NO_COMPONENTS,
  ASSEMBLY_BASE_CHOOSES_THE_SHEETS,
  SUBJECT_TYPE_ADDS_NO_COMPONENTS,
} from '../src/constants/guidanceSentences.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../src/constants/output/index.ts';
import {
  CATEGORY_SHEET_PLANS,
  modePlansOf,
  modesFor,
  plansFor,
  sheetSeriesFor,
} from '../src/constants/sheetPlans/index.ts';
import type { ModePlans } from '../src/constants/sheetPlans/index.ts';
import { standardSubjectOf } from '../src/test/assemblyBaseSubjects.ts';
import { sectionOf } from '../src/test/promptSections.ts';
import { DIRECTIONAL_MODES } from '../src/types/output.ts';
import type { DirectionalMode } from '../src/types/output.ts';
import type { DirectionSet } from '../src/types/rendering.ts';
import { SUBJECT_CATEGORIES } from '../src/types/subject.ts';
import type { SubjectCategory, SubjectDefinition } from '../src/types/subject.ts';
import { generatePrompt } from '../src/utils/promptCompiler.ts';

/**
 * The fields that name the subject and how it comes apart, against the inventory each one may or may
 * not move.
 *
 * **The defect this exists for was in the guidance before it was in the compiler, and it was found
 * three times.** First on *Assembly Base* (issue #233): three cards told the reader the field decides
 * how the sheet is broken up, and two of them stated figures — CHARACTER promised “the default 9 core
 * and 34 limb components”, where 9 is the `THREE_CLASSIC` figure, `DEFAULT_IMAGE_CONFIG.directions` is
 * `FIVE_CLASSIC` and the core is 15, and OBJECT promised that `Single Rigid Object` emits one piece,
 * where the studio's own OBJECT default then compiled to 30, 14 and 7 across its three modes. Then on
 * the first field of every form, `species` (issue #282): after the base's cards were corrected, six more
 * said the subject's type decides the component split, and EFFECT's said it decides how many frames the
 * sequence needs. Then issue #281 found the base's other half — a pooled base whose pieces no sheet draws
 * puts section 1 against section 4 on every sheet — and chose to let the plan follow the base: a base
 * its category declares in `sheetPlans/assemblyBases.ts` draws its own plans (issue #283), and OBJECT's
 * card is now true.
 *
 * **So the two fields are held to different claims.** `species` reaches section 1 and the identity-lock
 * digest and nothing else: every value compiles one section 4, and every card says so. The base moves
 * section 4 exactly where its category declares it to: values drawing one plan table compile one
 * section 4 and one count, and every card says what its category's bases do — so a card can neither
 * promise a breakdown its bases do not deliver nor deny one they do.
 *
 * **It compiles rather than reading the plan tables**, because the claim the cards made was about the
 * *prompt*: a reader is promised a component breakdown, and section 4 is where they would look for it.
 * Compiling is also what reaches the count section 0 binds the generator to, which is the figure a
 * reader sizes a job by and the one CHARACTER's card got wrong.
 *
 * It lives here rather than beside a module because it belongs to no one of them: the pools are in
 * `src/constants/categories/`, the inventory is in `src/constants/sheetPlans/`, and the claim is about
 * what the compiler does with the pair.
 */

/** One sheet a subject can be compiled at. */
interface Address {
  readonly mode: DirectionalMode;
  readonly directions: DirectionSet;
  readonly sheetIndex: number;
}

/** The field as one category defines it: its pool is every value a check holds for, and its card is the last check's. */
function fieldOf(category: SubjectCategory, key: 'species' | 'anatomy') {
  const field = CATEGORY_OPTIONS[category].fields.find((option) => option.key === key);
  if (field === undefined) throw new Error(`No ${key} field for ${category}.`);
  return field;
}

/** Every sheet this subject can be compiled at — which sheets exist is its assembly base's answer. */
function addressesOf(category: SubjectCategory, subject: SubjectDefinition): readonly Address[] {
  return modesFor(category, subject).flatMap((mode) =>
    CATEGORY_DIRECTION_SETS[category].flatMap((directions) =>
      sheetSeriesFor(category, subject, mode, directions).map((_, sheetIndex) => ({
        mode,
        directions,
        sheetIndex,
      })),
    ),
  );
}

/** Section 4, and the count section 0 contracts for, of one sheet compiled for this subject. */
function inventoryOf(
  category: SubjectCategory,
  subject: SubjectDefinition,
  { mode, directions, sheetIndex }: Address,
): { readonly section: string; readonly count: string | undefined } {
  const prompt = generatePrompt(category, subject, {
    ...DEFAULT_OUTPUT_CONFIG,
    directionalMode: mode,
    directions,
    sheetIndex,
  });
  return {
    section: sectionOf(prompt, 'COMPONENT INVENTORY'),
    count: /Exactly (\d+) components/.exec(prompt)?.[1],
  };
}

/** The address a failure names. */
function where(category: SubjectCategory, { mode, directions, sheetIndex }: Address): string {
  return `${category} / ${mode} / ${directions} / sheet ${String(sheetIndex + 1)}`;
}

describe('the subject’s type moves nothing in the inventory', () => {
  it.each(SUBJECT_CATEGORIES)('every %s species value compiles one section 4 and one count', (category) => {
    // Byte-identical, not merely equal in total: a value that swapped a forelimb for a tentacle while
    // keeping the count would satisfy an arithmetic check and would still be the mechanism the cards
    // claimed. The count is read out of the compiled prompt rather than from `componentCountFor`, which
    // takes no `species` — asking it would be asserting the signature rather than the behaviour. The
    // leading option is the reference because it is what `defaultSubjectFor` installs.
    const { options } = fieldOf(category, 'species');
    const [reference] = options;
    if (reference === undefined) throw new Error(`Empty species pool for ${category}.`);
    const subject = defaultSubjectFor(category);

    for (const address of addressesOf(category, subject)) {
      const expected = inventoryOf(category, { ...subject, species: reference }, address);
      expect(expected.count, `${where(category, address)} states no count`).toBeDefined();

      for (const species of options) {
        const actual = inventoryOf(category, { ...subject, species }, address);
        expect(actual.section, `${where(category, address)} / ${species}`).toBe(expected.section);
        expect(actual.count, `${where(category, address)} / ${species}`).toBe(expected.count);
      }
    }
  });

  it.each(SUBJECT_CATEGORIES)('every %s species value still reaches section 1 verbatim', (category) => {
    // The other half of the claim, and the reason this suite is not an argument for deleting the field.
    // It is what the generator is told the subject is, so every value has to arrive in section 1 exactly
    // as the pool spells it — a check that only asserted the absence would pass just as well on a field
    // the compiler had stopped reading at all.
    for (const species of fieldOf(category, 'species').options) {
      const prompt = generatePrompt(
        category,
        { ...defaultSubjectFor(category), species },
        DEFAULT_OUTPUT_CONFIG,
      );
      expect(sectionOf(prompt, 'SUBJECT DEFINITION'), `${category} / ${species}`).toContain(species);
    }
  });

  it.each(SUBJECT_CATEGORIES)('the %s species card says so', (category) => {
    // Every card carries the shared sentence, so a card rewritten to promise a breakdown again has to
    // take the sentence out to do it — and taking it out fails here.
    expect(fieldOf(category, 'species').tooltip).toContain(SUBJECT_TYPE_ADDS_NO_COMPONENTS);
  });
});

/** The category's default subject with its base set to this value. */
function withBase(category: SubjectCategory, anatomy: string): SubjectDefinition {
  return { ...defaultSubjectFor(category), anatomy };
}

/** The pooled bases, grouped by the plan table each draws, in pool order. */
function basesByPlans(category: SubjectCategory): readonly (readonly [ModePlans, readonly string[]])[] {
  const groups = new Map<ModePlans, string[]>();
  for (const anatomy of fieldOf(category, 'anatomy').options) {
    const plans = plansFor(category, withBase(category, anatomy));
    groups.set(plans, [...(groups.get(plans) ?? []), anatomy]);
  }
  return [...groups.entries()];
}

/**
 * Whether some base the category declares draws a different section 4 from the standard plans, on a
 * sheet mode both of them offer.
 *
 * Asked of the compiled inventory rather than of the table's shape, because a base that only takes
 * modes away draws the same sheets on the modes it keeps — and saying it brings its own component list
 * would then be false.
 */
function drawsItsOwnPieces(category: SubjectCategory): boolean {
  const standard = standardSubjectOf(category);
  const standardModes = modesFor(category, standard);

  return basesByPlans(category).some(([plans, [value = '']]) => {
    if (plans === CATEGORY_SHEET_PLANS[category]) return false;
    const declared = withBase(category, value);
    return addressesOf(category, declared).some((address) => {
      if (!standardModes.includes(address.mode)) return false;
      const lengths = [declared, standard].map(
        (subject) => sheetSeriesFor(category, subject, address.mode, address.directions).length,
      );
      if (lengths[0] !== lengths[1]) return true;
      return (
        inventoryOf(category, declared, address).section !== inventoryOf(category, standard, address).section
      );
    });
  });
}

/** Whether some plan table of the category is not offered a sheet mode another of its tables offers. */
function narrowsSheetContents(category: SubjectCategory): boolean {
  const tables = modePlansOf(category);
  const offered = DIRECTIONAL_MODES.filter((mode) => tables.some((plans) => plans[mode] !== undefined));
  return tables.some((plans) => offered.some((mode) => plans[mode] === undefined));
}

describe('the assembly base and the inventory it chooses', () => {
  it.each(SUBJECT_CATEGORIES)(
    'every %s base drawing one plan table compiles one section 4 and one count',
    (category) => {
      // The species check above, asked per plan table: values that share a table may not move the
      // inventory between them, so a value with no declaration still cannot.
      for (const [, values] of basesByPlans(category)) {
        const [reference, ...rest] = values;
        if (reference === undefined) continue;

        for (const address of addressesOf(category, withBase(category, reference))) {
          const expected = inventoryOf(category, withBase(category, reference), address);
          expect(expected.count, `${where(category, address)} / ${reference} states no count`).toBeDefined();

          for (const anatomy of rest) {
            const actual = inventoryOf(category, withBase(category, anatomy), address);
            expect(actual.section, `${where(category, address)} / ${anatomy}`).toBe(expected.section);
            expect(actual.count, `${where(category, address)} / ${anatomy}`).toBe(expected.count);
          }
        }
      }
    },
  );

  it.each(SUBJECT_CATEGORIES)(
    'a %s base typed in words the pool does not offer draws the standard plans',
    (category) => {
      // A guess at a typed base would change which components somebody pays a generation for, so free
      // text is matched to nothing. Every address rather than the studio's opening direction set, which
      // six categories never offer: filtered to it, their rows asserted nothing and passed.
      const standard = standardSubjectOf(category);
      for (const address of addressesOf(category, standard)) {
        expect(
          inventoryOf(category, withBase(category, 'A base nobody offered'), address).section,
          address.mode,
        ).toBe(inventoryOf(category, standard, address).section);
      }
    },
  );

  it('draws the rigid object whole, where an articulated one is cut into parts', () => {
    // The reported pair, on OBJECT's default sheet: the base the default subject opens on, and the first
    // value of the same pool that draws the standard plans.
    const address = {
      mode: 'CORE_DIRECTIONAL_VARIANTS',
      directions: DEFAULT_OUTPUT_CONFIG.directions,
      sheetIndex: 0,
    } as const;
    const rigid = inventoryOf('OBJECT', withBase('OBJECT', 'Single Rigid Object'), address).section;
    const turret = inventoryOf('OBJECT', withBase('OBJECT', 'Multi-Segment Turret'), address).section;

    expect(rigid).toContain('- Objects: ');
    expect(rigid).not.toContain('Access panel, lid or hatch');
    expect(turret).toContain('Access panel, lid or hatch');
  });

  it.each(SUBJECT_CATEGORIES)('every %s base still reaches section 1 verbatim', (category) => {
    // The half of the claim that holds for every value, declared or not: it is what the generator is
    // told the set comes apart by.
    for (const anatomy of fieldOf(category, 'anatomy').options) {
      const prompt = generatePrompt(category, withBase(category, anatomy), DEFAULT_OUTPUT_CONFIG);
      expect(sectionOf(prompt, 'SUBJECT DEFINITION'), `${category} / ${anatomy}`).toContain(anatomy);
    }
  });

  it.each(SUBJECT_CATEGORIES)('the %s base card says what its bases do', (category) => {
    // The guidance and the declarations, tied together. A card whose category has a base that moves the
    // sheet — onto other Sheet Contents, or onto a component list of its own — says the base can, and a
    // card whose bases do neither says the field moves nothing. So a card rewritten to promise a breakdown
    // has to be backed by a base that draws one, and a base that draws one cannot land on a card still
    // denying it.
    const { tooltip } = fieldOf(category, 'anatomy');
    const moves = drawsItsOwnPieces(category) || narrowsSheetContents(category);

    expect(tooltip.includes(ASSEMBLY_BASE_CHOOSES_THE_SHEETS), `${category} can move the sheet`).toBe(moves);
    expect(tooltip.includes(ASSEMBLY_BASE_ADDS_NO_COMPONENTS), `${category} moves nothing`).toBe(!moves);
  });

  it('finds both halves of that sentence true somewhere, so neither is a promise nothing keeps', () => {
    // The sentence says some bases are drawn by only certain Sheet Contents *or* bring a list of their
    // own. Each half has to be true of some category for the disjunction to be a description rather than
    // a hedge — and `it.each` above passes on helpers that answer `false` for everything, which is the
    // shape a moved table or a renamed pool would take.
    expect(SUBJECT_CATEGORIES.filter(drawsItsOwnPieces)).toEqual(['OBJECT']);
    expect(SUBJECT_CATEGORIES.filter(narrowsSheetContents)).toEqual([
      'OBJECT',
      'ITEM',
      'BUILDING',
      'INTERFACE',
      'TERRAIN',
      'BACKGROUND',
    ]);
  });
});
