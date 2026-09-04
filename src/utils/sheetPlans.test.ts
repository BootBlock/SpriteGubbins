import { describe, expect, it } from 'vitest';
import { NO_ADDITIONAL_ANATOMY } from '../constants/anatomy.ts';
import { CATEGORY_OPTIONS, defaultSubjectFor, fieldLabelFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { directionalModeChoices } from '../constants/output/index.ts';
import {
  CATEGORY_SHEET_PLANS,
  DEFAULT_MODE_FOR,
  modesFor,
  resolveMode,
  sheetSeriesFor,
  supportsMode,
} from '../constants/sheetPlans/index.ts';
import { CATEGORY_DIRECTION_SETS } from '../constants/categoryDirectionSets.ts';
import {
  CATEGORY_AUDIT_TEXT,
  CATEGORY_EXCLUSION_TEXT,
  CATEGORY_GUARD_TEXT,
  DIRECTION_LISTS,
  OBJECT_YAW,
} from '../constants/promptText/index.ts';
import { sectionOf } from '../test/promptSections.ts';
import { DIRECTIONAL_MODES } from '../types/output.ts';
import type { DirectionalMode } from '../types/output.ts';
import type { SheetPlan } from '../types/components.ts';
import type { DirectionSet } from '../types/rendering.ts';
import { SUBJECT_CATEGORIES } from '../types/subject.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';
import { formatAnatomyComponent, parseAdditionalAnatomy } from './additionalAnatomy.ts';
import { anatomyFacingsFor, componentCountFor } from './componentSet.ts';
import { planSlots } from './componentSlots.ts';
import { generatePrompt } from './promptCompiler.ts';
import { categoryPermits, PERMITTED_KINDS, validateAllSheetPlans } from './sheetPlanValidation.ts';

/**
 * The category-contamination regression suite.
 *
 * The defect: the component inventory was `Record<DirectionalMode, string>` — keyed on the sheet
 * mode alone, with no reference to the subject's category — so the two axes were free to combine
 * into nonsense. A CHARACTER on `TILESET_MODULAR` was handed sixteen floor and wall tiles, told to
 * assemble them into "a continuous floor field, a straight wall run", and separately told in
 * section 8 that floor tiles were forbidden. The generator followed the inventory and drew walls.
 *
 * Less visibly but more often: the *default* mode is a humanoid one, so OBJECT, ITEM and BUILDING
 * were each asking for a pelvis and two legs without anyone selecting anything unusual.
 *
 * What these tests pin is the property, not the example — no category may ever emit another's
 * vocabulary, whatever it is paired with.
 */

/**
 * Vocabulary that belongs only to a sheet whose components *are* the environment.
 *
 * Renamed from `TILE_VOCABULARY` because tiling stopped being the distinguishing property the moment
 * a second category took `TILESET_MODULAR`: a nine-slice frame's edges repeat and butt against
 * copies of themselves exactly as a floor field's do. Floors, walls and terrain are what remain
 * foreign to every category but one.
 *
 * **Every alternative is a string BUILDING's own plan writes**, which is what keeps the net a test
 * for *borrowed prose* rather than a ban on a topic — "every tile is seamless" stays for that
 * reason, even though a nine-slice could legitimately have said it, because a plan that reaches for
 * BUILDING's exact sentence is far likelier to have been copied from it than to have arrived there
 * independently. `INTERFACE_NINE_SLICE` states the same requirement in its own words.
 */
const ENVIRONMENT_VOCABULARY =
  /floor ×|wall top|wall face|floor edge trim|every tile is seamless|continuous floor field|straight wall run/i;

/**
 * The categories whose own section 8 bans an environment — every one but the category that *is* one.
 *
 * Derived from the exclusion text rather than from `PERMITTED_KINDS`, and that is the fix rather
 * than the tidy-up. The kinds gate answered "may this category contain a tile at all", which
 * distinguished BUILDING from the five categories that draw no tiles and would have quietly stopped
 * asking anything of INTERFACE the moment it gained a nine-slice. The property actually worth
 * asserting is narrower and does not care how many categories tile: **a category that forbids an
 * environment in section 8 must not require one in section 4**, which is the §4-requires/§8-forbids
 * contradiction the per-category text in `promptText/exclusions.ts` exists to remove.
 *
 * The probe is the word `environments` rather than `floor tiles`, which most of them happen to name
 * and VEHICLE does not — it bans "ground planes, road or runway surfaces" instead, and would
 * have been exempted by an accident of wording.
 */
const BANS_AN_ENVIRONMENT = SUBJECT_CATEGORIES.filter((category) =>
  /environments/i.test(CATEGORY_EXCLUSION_TEXT[category]),
);

/** Vocabulary that belongs only to a humanoid or creature articulation sheet. */
const LIMB_VOCABULARY = /upper arms?:|lower arms?:|left leg|right leg|pelvis|hindquarters|forelimb/i;

/**
 * Every sheet that actually exists — each pairing, walked down to the individual sheets of its
 * series.
 *
 * A pairing is no longer one prompt: a character's five-view directional core arrives as a core
 * sheet and an articulation sheet, and each has its own inventory to be contaminated. Checking the
 * first alone would have left the second unwatched by every assertion below.
 */
const SHEETS: readonly {
  category: SubjectCategory;
  mode: DirectionalMode;
  directions: DirectionSet;
  sheetIndex: number;
  sheet: string;
}[] = SUBJECT_CATEGORIES.flatMap((category) =>
  modesFor(category).flatMap((mode) =>
    CATEGORY_DIRECTION_SETS[category].flatMap((directions) =>
      sheetSeriesFor(category, mode, directions).map((plan, sheetIndex) => ({
        category,
        mode,
        directions,
        sheetIndex,
        sheet: plan.name,
      })),
    ),
  ),
);

/**
 * The same sweep as {@link SHEETS}, carrying the plan itself.
 *
 * `SHEETS` deliberately holds the sheet's *name*, because that is what its `it.each` titles read and
 * what a failure has to name; the checks on a plan's own declarations need the object. Both are one
 * walk of the same three axes rather than two, so a pairing that grows a sheet arrives in each.
 */
const EVERY_SERIES: readonly {
  category: SubjectCategory;
  mode: DirectionalMode;
  directions: DirectionSet;
}[] = SUBJECT_CATEGORIES.flatMap((category) =>
  modesFor(category).flatMap((mode) =>
    CATEGORY_DIRECTION_SETS[category].map((directions) => ({ category, mode, directions })),
  ),
);

const EVERY_PLAN: readonly {
  category: SubjectCategory;
  mode: DirectionalMode;
  directions: DirectionSet;
  sheet: string;
  plan: SheetPlan;
}[] = SUBJECT_CATEGORIES.flatMap((category) =>
  modesFor(category).flatMap((mode) =>
    CATEGORY_DIRECTION_SETS[category].flatMap((directions) =>
      sheetSeriesFor(category, mode, directions).map((plan) => ({
        category,
        mode,
        directions,
        sheet: plan.name,
        plan,
      })),
    ),
  ),
);

function promptFor(
  category: SubjectCategory,
  mode: DirectionalMode,
  additional?: string,
  sheetIndex = 0,
  directions: DirectionSet = DEFAULT_OUTPUT_CONFIG.directions,
): string {
  const subject = {
    ...defaultSubjectFor(category),
    additional_anatomy: additional ?? NO_ADDITIONAL_ANATOMY,
  };
  return generatePrompt(category, subject, {
    ...DEFAULT_OUTPUT_CONFIG,
    directionalMode: mode,
    directions,
    sheetIndex,
  });
}

describe('the plan table itself', () => {
  it('files no plan under a category that cannot contain it', () => {
    // Structural, not textual: an entry of kind `tile` under CHARACTER is the contamination, and it
    // is visible in the data long before it becomes a sentence in a prompt.
    expect(validateAllSheetPlans()).toEqual([]);
  });

  it.each(SUBJECT_CATEGORIES)('%s offers at least one mode, and defaults to one it supports', (category) => {
    expect(modesFor(category).length).toBeGreaterThan(0);
    // If this ever failed, `sheetPlanFor` would throw for a pairing a user can reach.
    expect(supportsMode(category, DEFAULT_MODE_FOR[category])).toBe(true);
  });

  it('draws every moving part at rest on the rig sheets, and on no others', () => {
    // The claim the rig table used to make as a `Record<DirectionalMode, RigMode>` with one entry in
    // it, now that the answer sits on the plan instead. `fixedRigMode` reads `'AT_REST'` and hands
    // back `CUTOUT_RIG` outright, so a plan that took that value without being a sheet of rig pieces
    // would settle the rig for an inventory it does not describe — and a rig plan that lost it would
    // put a rig-pieces inventory back above an assembly promise with no articulation section between
    // them, which is the defect `rigModes.test.ts` is named for.
    //
    // Both directions, because either one alone passes on half a table.
    const atRest = EVERY_PLAN.filter(({ plan }) => plan.posing === 'AT_REST');
    const rigSheets = EVERY_PLAN.filter(({ mode }) => mode === 'CUTOUT_RIG_SINGLE_DIRECTION');

    expect(atRest).toEqual(rigSheets);
    expect(atRest.length).toBeGreaterThan(0);
  });

  it('never asks one pairing to be both a rig and its own posed artwork', () => {
    // `resolveRigMode` reads both values off the whole series and answers `fixedRigMode` first, so a
    // pairing carrying an `'AT_REST'` sheet *and* a `'PER_POSITION'` one would settle on
    // `CUTOUT_RIG` while `offersRigMode` was withdrawing it — the two halves of one relation
    // disagreeing, silently, in favour of the rig the posed sheet cannot draw. No pairing does that
    // today, and a plan that made one has to be caught here rather than by whichever answer won.
    for (const { category, mode, directions } of EVERY_SERIES) {
      const series = sheetSeriesFor(category, mode, directions);
      const both =
        series.some((plan) => plan.posing === 'AT_REST') &&
        series.some((plan) => plan.posing === 'PER_POSITION');

      expect(both, `${category} / ${mode} / ${directions}`).toBe(false);
    }
  });

  it('names the sheets whose artwork has already settled the motion', () => {
    // The converse relation, and the one that decides whether a sheet can carry a cut-out rig at
    // all: `'PER_POSITION'` says the inventory draws a moving part once per position it takes, so
    // `offersRigMode` withdraws the rig whose first rule is that no piece commits to a position.
    //
    // **Written out rather than derived**, for the reason `rigModes.test.ts` writes out the nine
    // categories that turn about nothing: the value is a judgement made at each plan and argued
    // there, not a fact falling out of another list. Nothing mechanical can replace it, either — a
    // line worth several components is equally how a tileset lists four corners, and the portrait's
    // twelve expressions are twelve lines each worth exactly one. So what this holds is that a plan
    // changing its answer is a deliberate edit that shows up here.
    const posed = [
      ...new Set(
        EVERY_PLAN.filter(({ plan }) => plan.posing === 'PER_POSITION').map(
          ({ category, sheet }) => `${category} / ${sheet}`,
        ),
      ),
    ];

    expect(posed).toEqual([
      // The limb variants of both figure categories, on both of the modes that draw them.
      'CHARACTER / Pose library',
      'CHARACTER / Articulation',
      'CREATURE / Pose library',
      'CREATURE / Articulation',
      // A hatch closed, part-open and fully open; a working end in two states; an entrance module
      // closed and open; a mount stowed, traversed and elevated. Only two of these four categories
      // articulate — `CATEGORY_RIG_MODES` gives ITEM and BUILDING `NONE` alone — which is the point
      // the rest of this list makes as well: the value is a statement about an inventory, and a
      // category with no joints still answers it truthfully.
      'OBJECT / Part library',
      'ITEM / Part library',
      'BUILDING / Module library',
      'VEHICLE / Part library',
      // One phenomenon at successive moments, which is the same statement about time.
      'EFFECT / Frame sequence',
      // A button body in four states, a toggle in three; and the end caps and stretching middle of
      // the nine-slice drawn again pressed.
      'INTERFACE / State library',
      'INTERFACE / Nine-slice set',
      // One face drawn once per expression, and one overlay drawn at two stages of a cooldown.
      'PORTRAIT / Expression set',
      'ICON / Symbol set',
    ]);
  });

  it('gives the tileset only to the categories that assemble from repeating pieces', () => {
    // BUILDING is labelled "Building / Environment Tile", INTERFACE ships a nine-slice whose corners
    // are fixed while its edges and centre repeat and butt against copies of themselves, and
    // TERRAIN's blend set is the ground the first of those stands on — which is what this mode
    // means. BACKGROUND is the fourth and the one that repeats along a single axis: a parallax band
    // butts against its own copy along the scroll direction, and "no visible join where it repeats"
    // is the same requirement a floor field has. Every other category is a *subject* rather than a
    // field of pieces, and a CHARACTER reaching this mode is the exact pairing the reported defect
    // produced.
    const withTileset = SUBJECT_CATEGORIES.filter((c) => supportsMode(c, 'TILESET_MODULAR'));
    expect(withTileset).toEqual(['BUILDING', 'INTERFACE', 'TERRAIN', 'BACKGROUND']);
  });

  it('exempts exactly the categories whose components are the environment', () => {
    // The guard on `BANS_AN_ENVIRONMENT` above. It is derived by matching prose, so a reword of one
    // exclusion line could empty it and take the check below with it, silently — this is what makes
    // that loud. BUILDING, TERRAIN and BACKGROUND are the exemptions, and they are the only ones: a
    // building tileset's inventory *is* floor tiles, a terrain's *is* the ground plane, and a
    // background's *is* the scenery the other categories call scenery — which is why all three ban
    // inhabitants and clutter instead. INTERFACE is not among them — a nine-slice repeats, but a
    // panel frame is not an environment, so it bans one like everything else; and ICON is not,
    // because a mark in a cell depicts a thing rather than a place.
    const exempt = SUBJECT_CATEGORIES.filter((c) => !BANS_AN_ENVIRONMENT.includes(c));
    expect(exempt).toEqual(['BUILDING', 'TERRAIN', 'BACKGROUND']);
  });

  it('gives the frame to the one category that is a sequence, and to no other', () => {
    // `frame` classifies a position in *time* where every other kind classifies a piece of the
    // subject, so it is the one pairing in `PERMITTED_KINDS` that has to hold in both directions —
    // and a one-way check would pass on either half of the misfiling it exists to catch. A frame
    // under OBJECT sits in a plan whose every other entry is a part that coexists with the rest; a
    // part breakdown that drifts onto an effect sheet ships an explosion with a hatch and a footing.
    const withFrames = SUBJECT_CATEGORIES.filter((c) => categoryPermits(c, 'frame'));
    expect(withFrames).toEqual(['EFFECT']);
    expect(PERMITTED_KINDS.EFFECT).toEqual(['frame']);
  });

  it('gives EFFECT the one mode that leaves its budget for time', () => {
    // The directional modes spend the sheet on facings, which delivers stills of a thing whose whole
    // identity is that it changes — and section 3's rotation half asks an explosion to prove it
    // turned by occluding surfaces it does not have. A rig articulates about pivots an effect has
    // none of. What a *directional* effect needs is this mode plus a direction set, which a `'run'`
    // sheet reads as a run list: eight frame sequences, not one sheet of eight frames.
    expect(modesFor('EFFECT')).toEqual(['SINGLE_DIRECTION_POSE_LIBRARY']);
    const [sequence] = sheetSeriesFor('EFFECT', 'SINGLE_DIRECTION_POSE_LIBRARY', 'EIGHT_COMPASS');
    expect(sequence.facings).toBe('run');
  });

  it('splits the eight-compass core by yaw parity, and the halves partition the set', () => {
    // Two properties in one: the cardinal sheet holds exactly the multiples of 90 and the diagonal
    // sheet the rest, and together they draw each facing of the set exactly once — a facing drawn
    // twice inflates the count, and one drawn nowhere is a view the game cannot show.
    for (const category of SUBJECT_CATEGORIES) {
      if (!supportsMode(category, 'CORE_DIRECTIONAL_VARIANTS')) continue;
      if (!CATEGORY_DIRECTION_SETS[category].includes('EIGHT_COMPASS')) continue;
      const series = sheetSeriesFor(category, 'CORE_DIRECTIONAL_VARIANTS', 'EIGHT_COMPASS');
      const multiView = series.filter((plan) => plan.facings !== 'run');
      expect(multiView, category).toHaveLength(2);

      const [cardinals, diagonals] = multiView;
      if (
        cardinals === undefined ||
        diagonals === undefined ||
        cardinals.facings === 'run' ||
        diagonals.facings === 'run'
      ) {
        throw new Error('narrowed above');
      }
      for (const facing of cardinals.facings) expect(OBJECT_YAW[facing] % 90).toBe(0);
      for (const facing of diagonals.facings) expect(OBJECT_YAW[facing] % 90).not.toBe(0);
      expect([...cardinals.facings, ...diagonals.facings].sort(), category).toEqual(
        [...DIRECTION_LISTS.EIGHT_COMPASS].sort(),
      );
      // And the two halves are tellable apart everywhere a sheet is named.
      expect(cardinals.name).toContain('cardinal');
      expect(diagonals.name).toContain('diagonal');
    }
  });
});

describe('an EFFECT sheet does not forbid in section 8 what it requires in section 4', () => {
  // The same contradiction the BUILDING tileset had, arriving from the other direction: section 8's
  // *static* list banned "particle effects" outright, which was true while every category's subject
  // was a solid object and false the moment one of them could ask for a spark shower by name.
  const SPARKS = 'Trailing Spark Shower';

  function sectionsOf(subject: SubjectDefinition) {
    const prompt = generatePrompt('EFFECT', subject, {
      ...DEFAULT_OUTPUT_CONFIG,
      directionalMode: DEFAULT_MODE_FOR.EFFECT,
    });
    return {
      prompt,
      inventory: sectionOf(prompt, 'COMPONENT INVENTORY'),
      exclusions: sectionOf(prompt, 'EXCLUSIONS'),
    };
  }

  it('asks for the secondary layer the subject named', () => {
    const { prompt, inventory } = sectionsOf({ ...defaultSubjectFor('EFFECT'), clothing: SPARKS });

    // Section 1 carries the subject's own words; section 4 names the *role* rather than repeating
    // them, exactly as every other category's plan does — an inventory reading "spark shower" would
    // be inferring on the template's behalf for every frost nova and portal that has none. So the
    // contradiction is between what the subject asked for and what section 8 then banned, and both
    // halves have to be in the prompt for it to exist at all.
    expect(prompt).toContain(SPARKS);
    expect(inventory).toContain('Residue and clearing — 6');
    expect(inventory).toContain('whatever secondary\nlayer the subject named, painted into these frames');
    // Section 1 says every applied attribute is painted onto the component it sits on, excepting only
    // what the sheet's own plan draws separately — which on an EFFECT sheet is the additional
    // elements and nothing else. Breaking the subject's secondary layer out into six components of
    // its own would have made that sentence false — so the tail of the sequence is more frames,
    // never a second layer to composite.
    // Asserted positively rather than by banning the vocabulary: the plan *uses* both "composited"
    // and "a second layer" in the sentences that forbid them, so a negative on either would fail on
    // the disclaimer that makes the point.
    expect(inventory).toContain('painted into these frames');
    expect(inventory).toContain('This is a stretch of time, not a second layer to composite');
    expect(inventory).toContain('only makes sense composited over its neighbour is a failure');
  });

  it('bans only the particles the inventory did not name', () => {
    const { exclusions } = sectionsOf({ ...defaultSubjectFor('EFFECT'), clothing: SPARKS });
    expect(exclusions).toContain('any particle');
    expect(exclusions).toContain('the inventory in section 4 does not name');
    // The unqualified form is what made the two sections contradict each other.
    expect(exclusions).not.toContain('silhouette, particle effects');
  });

  it('still bans the source the effect plays against, which is this category’s own hazard', () => {
    // Asked for a muzzle flash, a generator draws the gun; asked for an impact spark, the thing
    // being hit. Neither is scenery, so the environment ban the other categories carry misses both.
    //
    // Asserted as the relation plus the nouns rather than as one phrase, because the phrase is what
    // moved: the modifier used to trail all seven nouns and now leads them, so that four `Effect
    // Type` options named after one of those nouns are not read as being banned themselves. Which
    // options those are, and that the text names each, is `promptText/exclusions.test.ts`.
    const { exclusions } = sectionsOf(defaultSubjectFor('EFFECT'));
    expect(exclusions).toContain('whatever the effect issues from or lands on');
    expect(exclusions).toContain('weapon, muzzle, launcher, projectile or struck surface');
  });

  it('leaves the ban unqualified in substance for a category that names no particles', () => {
    // The repair may not have weakened section 8 for the six categories it was already right for:
    // a CHARACTER inventory names no particle effect, so nothing there is exempted by the clause.
    const prompt = generatePrompt('CHARACTER', defaultSubjectFor('CHARACTER'), DEFAULT_OUTPUT_CONFIG);
    const exclusions = sectionOf(prompt, 'EXCLUSIONS');
    const inventory = sectionOf(prompt, 'COMPONENT INVENTORY').toLowerCase();

    expect(exclusions).toContain('any particle');
    expect(inventory).not.toContain('particle');
    expect(inventory).not.toContain('spark');
  });
});

describe('no category calls the subject’s own additions an error in the specification', () => {
  /**
   * The §4-requires/§9-forbids contradiction, arriving from the field rather than from the plan.
   *
   * Section 4 appends whatever `additional_anatomy` holds to the inventory, counted and slotted like
   * every entry above it. The guard directly over that list says “every entry below is X” and then
   * tells the reader that an entry which does not belong “is an error in this specification, not an
   * instruction to follow”; the §9 audit is the same claim as a check they perform before
   * delivering. Unqualified, both condemn components §4 had just required.
   *
   * EFFECT carried the only carve-out, written on the reading that a character's extra horn is still
   * anatomy and a vehicle's extra pod is still a part. That is a judgement about two *options*, and
   * the pools hold `Floating Rune Sigil ×3`, `Empty Saddle ×1, Stirrup ×2, Rein Strap ×1` and
   * `Speaking Mouth Shapes ×4` — the last of which is the one that was reported. So the exemption is
   * available to every category, and this suite walks the pools rather than naming the categories it
   * believes need it: the judgement is what rots, and a pool that gains an option fails nothing.
   */
  const EXEMPTS = {
    guard: (label: string) => `, apart from the pieces named under ${label}`,
    audit: (label: string) => `, or one of the pieces named under ${label}`,
  } as const;

  /**
   * Written out rather than imported from `exclusions.ts`, whose two helpers are module-private on
   * purpose: importing them would compare each record with the thing that wrote it and pass whatever
   * either said. What is asserted here is the wording that reaches a prompt.
   */
  const labelFor = (category: SubjectCategory) => fieldLabelFor(category, 'additional_anatomy');

  /** Every value a reader reaches by picking rather than typing, with the category offering it. */
  const POOLED: readonly { category: SubjectCategory; option: string }[] = SUBJECT_CATEGORIES.flatMap(
    (category) =>
      (CATEGORY_OPTIONS[category].fields.find((field) => field.key === 'additional_anatomy')?.options ?? [])
        .filter((option) => option !== NO_ADDITIONAL_ANATOMY)
        .map((option) => ({ category, option })),
  );

  /** Every sheet that appends no block, so no sentence on it may except one. */
  const APPENDS_NOTHING = SHEETS.filter(
    ({ category, mode, directions, sheetIndex }) =>
      anatomyFacingsFor(category, mode, directions, sheetIndex) === null,
  );

  it.each(SUBJECT_CATEGORIES)('%s splices the exemption into its opening claim', (category) => {
    const label = labelFor(category);
    for (const [sentence, clause] of [
      [CATEGORY_GUARD_TEXT[category], EXEMPTS.guard(label)],
      [CATEGORY_AUDIT_TEXT[category], EXEMPTS.audit(label)],
    ] as const) {
      // Containment alone would pass on a clause that had drifted out of the opening claim into some
      // later sentence of the same entry, which is what the retired EFFECT-only test pinned with a
      // pair of negatives written against its own join. Take the clause back out and what is left
      // has to *open* with the sentence the record states without one — so the join is asserted,
      // without this suite having to restate thirteen prefixes it would then have to keep in step.
      //
      // `startsWith` rather than equality, because a category may also answer the exemption in its
      // own terms: PORTRAIT's audit ends by saying what an extra piece *is* held to, since the
      // sentence before it asks every component to be the same face at the same crop, and a sweat
      // drop is not. That addendum is the only thing this allows past the join.
      expect(sentence(null)).not.toContain('the pieces named under');
      expect(sentence(label)).toContain(clause);
      expect(sentence(label).replace(clause, '').startsWith(sentence(null))).toBe(true);
    }
  });

  it('has a pooled addition to walk under every category', () => {
    // The walk below is `it.each`, which asserts nothing at all for a category contributing no rows
    // — so a field that lost its pool would take its category out of this suite silently.
    expect(new Set(POOLED.map(({ category }) => category)).size).toBe(SUBJECT_CATEGORIES.length);
  });

  it.each(POOLED)(
    '$category / $option arrives counted, under a guard that admits it',
    ({ category, option }) => {
      const mode = DEFAULT_MODE_FOR[category];
      const label = labelFor(category);
      const pieces = parseAdditionalAnatomy(option);
      const prompt = promptFor(category, mode, option);
      const inventory = sectionOf(prompt, 'COMPONENT INVENTORY');

      // The contradiction needs both halves in the prompt to exist at all: §4 has to be asking for
      // the pieces before the guard over them can be condemning anything. The count is derived
      // rather than written down, so a category whose appended block stopped being counted fails
      // here too.
      expect(inventory).toContain(`#### ${label} —`);
      for (const piece of pieces) {
        expect(inventory).toContain(`- ${formatAnatomyComponent(piece)}`);
      }
      expect(prompt).toContain(
        `Exactly ${String(componentCountFor(category, mode, DEFAULT_OUTPUT_CONFIG.directions, 0, pieces))} components`,
      );

      // Sliced by section rather than searched for in the whole prompt: the guard's exemption has to
      // be over the inventory it exempts, and the audit's has to be in the list the reader works
      // through before delivering.
      expect(inventory).toContain(EXEMPTS.guard(label));
      expect(sectionOf(prompt, 'LAYOUT AND SELF-AUDIT')).toContain(EXEMPTS.audit(label));
    },
  );

  it.each(APPENDS_NOTHING)(
    'excepts nothing on $category / $mode / $directions / $sheet, which appends no block',
    ({ category, mode, directions, sheetIndex }) => {
      // The other half of the rule, and the one an unconditional clause got wrong: these sheets omit
      // the block deliberately — a later sheet of a series draws the trunk's articulation, and a tail
      // beside it would hang on nothing — so §1's line is blanked and the count excludes the pieces.
      // A sentence excepting them there names a class the rest of the prompt never mentions.
      const option = POOLED.find((row) => row.category === category)?.option;
      expect(option).toBeDefined();

      const prompt = promptFor(category, mode, option, sheetIndex, directions);
      expect(prompt).not.toContain('the pieces named under');
      expect(sectionOf(prompt, 'COMPONENT INVENTORY')).not.toContain(`#### ${labelFor(category)} —`);
    },
  );
});

describe('no category emits another category’s components', () => {
  it.each(SHEETS)(
    '$category / $mode / $directions / $sheet',
    ({ category, mode, directions, sheetIndex }) => {
      const prompt = promptFor(category, mode, undefined, sheetIndex, directions);
      const section = sectionOf(prompt, 'COMPONENT INVENTORY');
      expect(section).not.toBe('');

      // Neither half is a list of category names, and that is the fix rather than the tidy-up: the
      // limb half used to read `category === 'OBJECT' || category === 'ITEM'`, so VEHICLE — which
      // holds exactly OBJECT's `['structure', 'mechanism']` pair — joined this suite running only the
      // tile half. It passed, because the vehicle plans happen to name no limbs, and nothing said the
      // other half had stopped being asserted. A list of names cannot notice a seventh category; each
      // half has to be answered by something the seventh category is obliged to fill in.
      //
      // The two halves are derived from *different* things, and the reason is above each constant: a
      // category either admits anatomy or it does not, which the kinds table answers, while whether it
      // may draw an environment is what its own section 8 answers — and only that second one stopped
      // tracking the kinds table when INTERFACE took the tileset mode.
      //
      // `validateAllSheetPlans` does not make either redundant. `kind` is hand-assigned per entry, so
      // `{ text: 'Left leg ×1', kind: 'structure' }` satisfies the structural check and only the prose
      // net catches it — which is why the two run side by side.
      if (!PERMITTED_KINDS[category].includes('anatomy')) {
        expect(section).not.toMatch(LIMB_VOCABULARY);
      }
      if (BANS_AN_ENVIRONMENT.includes(category)) {
        expect(section).not.toMatch(ENVIRONMENT_VOCABULARY);
      }
    },
  );
});

describe('the reported failure: a CHARACTER asked for a tileset', () => {
  const CYBORG = 'Demon Horn ×2, Tail ×1';

  it('cannot be configured at all — the mode is not offered to a character', () => {
    expect(supportsMode('CHARACTER', 'TILESET_MODULAR')).toBe(false);
    expect(
      directionalModeChoices('CHARACTER', DEFAULT_OUTPUT_CONFIG, []).map((choice) => choice.value),
    ).not.toContain('TILESET_MODULAR');
  });

  it('degrades to the category’s own sheet if such a pairing arrives from stored data', () => {
    // A preset or history row saved before the plans were split by category can still name it.
    expect(resolveMode('CHARACTER', 'TILESET_MODULAR')).toBe(DEFAULT_MODE_FOR.CHARACTER);
  });

  it('produces a humanoid sheet, not floors and walls', () => {
    const prompt = promptFor('CHARACTER', 'TILESET_MODULAR', CYBORG);

    // The exact strings from the malformed prompt.
    expect(prompt).not.toContain('Floor ×4');
    expect(prompt).not.toContain('Wall top');
    expect(prompt).not.toContain('Wall face');
    expect(prompt).not.toContain('Floor edge trim');
    expect(prompt).not.toContain('Every tile is seamless');
    expect(prompt).not.toContain('a continuous floor field');
    expect(prompt).not.toContain('a straight wall run');

    // And it is a character sheet instead.
    expect(prompt).toContain('Heads: front, front-three-quarter, right side, back-three-quarter, back');
    expect(prompt).toContain('Torsos: front, front-three-quarter, right side, back-three-quarter, back');
  });

  it('keeps the subject’s own additional anatomy, which was the only correct part of it', () => {
    // The degraded pairing is the five-view directional core, so the anatomy arrives the way that
    // sheet draws everything: each piece at each of the five facings, fifteen components in all.
    const prompt = promptFor('CHARACTER', 'TILESET_MODULAR', CYBORG);
    expect(prompt).toContain(
      '- Demon Horn ×2: front, front-three-quarter, right side, back-three-quarter, back.',
    );
    expect(prompt).toContain('- Tail ×1: front, front-three-quarter, right side, back-three-quarter, back.');
    expect(prompt).toContain('#### Additional Genuine Anatomy — 15');
  });
});

describe('an INTERFACE sheet may draw the frames it is made of', () => {
  /**
   * The second §4-requires/§8-forbids contradiction, found where the first one was fixed.
   *
   * Sections 0 and 8 both listed "frames, borders" among the things absent from the image entirely,
   * and this is the one category whose components *are* frames. Section 0's precedence rules did
   * answer it — section 4 outranks section 8, so the entry is still drawn — but the reading they
   * arrive at is a panel drawn with no edge, which is not a panel. Both bans now name a *placement*
   * rather than a shape, which is strictly more correct for the other six as well: a building's
   * window frame and an object's display cabinet were caught by the old wording too.
   */
  const flatten = (text: string): string => text.replace(/\s+/g, ' ');

  it('bans a frame drawn around the image or a component, not a frame that is one', () => {
    const prompt = promptFor('INTERFACE', 'SINGLE_DIRECTION_POSE_LIBRARY');
    expect(prompt).toContain('Panel or window frame ×1');

    const contract = sectionOf(prompt, 'NON-NEGOTIABLE OUTPUT CONTRACT');
    const exclusions = sectionOf(prompt, 'EXCLUSIONS');
    expect(flatten(contract)).toContain('no frame or border around the image or around a component');
    expect(flatten(exclusions)).toContain('frames or borders around the image or around a component');

    // The wording that shipped, in both sections. Named exactly, because a revert would otherwise
    // only surface as a sheet of panels with no edges.
    expect(flatten(prompt)).not.toContain('callouts, frames, borders');
  });

  it('says so in section 4, where the inventory is about to list one', () => {
    // Defence in depth, and the same argument as `CATEGORY_GUARD_TEXT` itself: the template wording
    // above is what makes the sheet possible, and this sentence is what makes the reasoning visible
    // at the point a reader meets the entry.
    expect(promptFor('INTERFACE', 'TILESET_MODULAR')).toContain(
      'are components — the subject of the sheet, not the annotation section 0 forbids',
    );
  });
});

describe('a BUILDING tileset is still a tileset', () => {
  it('keeps every tile the original inventory named', () => {
    const prompt = promptFor('BUILDING', 'TILESET_MODULAR');
    for (const tile of [
      'Floor ×4',
      'Wall top ×1, wall face ×1',
      'Wall top corners ×4',
      'Wall face corners ×4',
      'Floor edge trim ×2',
    ]) {
      expect(prompt).toContain(tile);
    }
    expect(prompt).toContain('a continuous floor field, a straight wall run');
  });

  it('no longer forbids in section 8 what it requires in section 4', () => {
    // The contradiction that shipped: the exclusion list was static, so a tileset was told to draw
    // floor tiles and then told floor tiles were absent from the image entirely.
    const prompt = promptFor('BUILDING', 'TILESET_MODULAR');
    const exclusions = sectionOf(prompt, 'EXCLUSIONS');

    expect(exclusions).not.toContain('floor tiles');
    expect(exclusions).toContain('Characters, creatures, vehicles');
  });

  it('still forbids scenery on a character sheet', () => {
    const exclusions = sectionOf(promptFor('CHARACTER', 'CORE_DIRECTIONAL_VARIANTS'), 'EXCLUSIONS');
    expect(exclusions).toContain('floor tiles');
  });
});

describe('the declared count is the inventory’s own length', () => {
  it.each(SHEETS)(
    '$category / $mode / $directions / $sheet',
    ({ category, mode, directions, sheetIndex, sheet }) => {
      const prompt = promptFor(category, mode, 'Demon Horn ×2, Tail ×1', sheetIndex, directions);
      const expected = componentCountFor(category, mode, directions, sheetIndex, [
        { name: 'Demon Horn', count: 2 },
        { name: 'Tail', count: 1 },
      ]);

      // Stated four times over; all four are the same sum or the sheet is silently wrong.
      expect(prompt).toContain(`Exactly ${String(expected)} components`);
      expect(prompt).toContain(`### Component inventory: ${sheet} — ${String(expected)} in total`);
      expect(prompt).toContain(`Component count is exactly ${String(expected)}.`);
    },
  );
});

describe('every mode of the union is reachable from some category', () => {
  it('leaves no orphan mode that the studio can never produce', () => {
    // A mode in the union that no category claims would be dead weight in stored data and in the
    // parser that validates it.
    for (const mode of DIRECTIONAL_MODES) {
      const owners = SUBJECT_CATEGORIES.filter((category) => supportsMode(category, mode));
      expect(owners.length, `${mode} belongs to no category`).toBeGreaterThan(0);
    }
  });

  it('has a plan for every pairing it claims to support', () => {
    for (const category of SUBJECT_CATEGORIES) {
      for (const mode of modesFor(category)) {
        expect(CATEGORY_SHEET_PLANS[category][mode]).toBeDefined();
      }
    }
  });
});

describe('every inventory line carries an identifier the manifest can use', () => {
  /** Every plan the table holds, whatever direction set produces it, with the facings it was built for. */
  const everyPlan = SUBJECT_CATEGORIES.flatMap((category) =>
    modesFor(category).flatMap((mode) =>
      (CATEGORY_DIRECTION_SETS[category] as readonly DirectionSet[]).flatMap((directions) =>
        sheetSeriesFor(category, mode, directions).map((plan) => ({ category, mode, directions, plan })),
      ),
    ),
  );

  it('spells every label as a slug', () => {
    for (const { category, mode, plan } of everyPlan) {
      for (const entry of plan.groups.flatMap((group) => group.entries)) {
        expect(entry.label, `${category}/${mode}/${plan.name}: ${entry.text}`).toMatch(
          /^[a-z0-9]+(-[a-z0-9]+)*$/,
        );
      }
    }
  });

  it('gives a line that names its parts exactly one name per component', () => {
    // `componentSlots` takes the names straight from `parts`, so a list of the wrong length makes the
    // name list a different length from the component count — which maps every sprite after the
    // divergence onto the wrong component, the failure the whole arrangement is arranged against.
    for (const { category, mode, plan } of everyPlan) {
      for (const entry of plan.groups.flatMap((group) => group.entries)) {
        if (entry.parts === undefined) continue;
        expect(entry.parts, `${category}/${mode}/${plan.name}: ${entry.text}`).toHaveLength(entry.count);
      }
    }
  });

  it('spells every part name as a slug', () => {
    for (const { category, mode, plan } of everyPlan) {
      for (const entry of plan.groups.flatMap((group) => group.entries)) {
        for (const part of entry.parts ?? []) {
          expect(part, `${category}/${mode}/${plan.name}: ${entry.text}`).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
        }
      }
    }
  });

  it('never names two components of one plan the same thing', () => {
    // Stronger than the line-level check below, and it is the half `parts` made reachable: two lines
    // with distinct labels can still land on one name, and `componentSlots` would then rename the
    // second to `x-2` — a name that reads as the second copy of something rather than as the
    // collision it is.
    //
    // Asserted on `planSlots`, which is the expansion a pack writes *before* `unique` runs. Neither
    // of the two nearer answers works: `componentSlots` applies that rename, so it guarantees the
    // property being checked here and the assertion could never fail; and walking `parts` alone
    // reaches 98 of the table's 418 entries, missing exactly the collision that is live — an
    // authored name landing on one another line *derives*, since the authoring convention puts
    // ordinals inside part names (`mounting-bracket-1`) and the derived branch produces that shape.
    for (const { category, mode, plan } of everyPlan) {
      const names = planSlots(plan);
      expect(new Set(names).size, `${category}/${mode}/${plan.name}: ${names.join(', ')}`).toBe(names.length);
    }
  });

  it('never names two lines of one plan the same thing', () => {
    // Within a plan a label is an identity: `componentSlots` suffixes it with a facing or an ordinal,
    // so two lines sharing one label produce two runs of the same names for different components.
    // Across plans they may repeat freely — a vehicle's `fittings` and an item's are not related.
    for (const { category, mode, plan } of everyPlan) {
      const labels = plan.groups.flatMap((group) => group.entries.map((entry) => entry.label));
      expect(new Set(labels).size, `${category}/${mode}/${plan.name}: ${labels.join(', ')}`).toBe(
        labels.length,
      );
    }
  });
});
