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
import type { ComponentEntry, ComponentGroup, SheetPlan } from '../types/components.ts';
import type { DirectionSet } from '../types/rendering.ts';
import { SUBJECT_CATEGORIES } from '../types/subject.ts';
import type { ScaleUnitFrame, SubjectCategory, SubjectDefinition } from '../types/subject.ts';
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

/**
 * The `clothing` value every prompt in this suite is compiled with — the category's own default,
 * since `promptFor` builds its subject from `defaultSubjectFor`.
 *
 * Stated rather than passed as `''`, because the count is a function of it: BACKGROUND and INTERFACE
 * both default to the value meaning the subject has none of what the field describes, so their plans
 * lose the entries drawing it, and a count taken against the declared plan would be a figure no
 * prompt in this file states.
 */
function defaultClothing(category: SubjectCategory): string {
  return defaultSubjectFor(category).clothing;
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

  /**
   * Which frame each pairing's sheets state section 2's share in, written out rather than read back
   * off the plans.
   *
   * **The whole claim of issue #216 is in this column**, so an expectation gathered from the plans
   * themselves would assert nothing about it — both sides would move together, and a sheet flipped
   * back to the reading that was false on it would pass. BACKGROUND is the pair to read: its
   * parallax set draws nine bands and takes the cell, its layer library draws none and takes the
   * sheet, and no single answer is true of both — which is what the per-category record it replaces
   * had to settle for. INTERFACE has the same two modes and takes the sheet on both, because its
   * state library draws exactly one panel frame and one of anything cannot argue with a count.
   *
   * **One entry per pairing, and that is the granularity the frame is allowed.** A profile is chosen
   * once and a whole series is generated under it, so the frame may not change between the sheets of
   * one batch — a series is one pairing, so this table has room for exactly one answer per batch and
   * the assertion below is what holds the plans to it.
   */
  const PAIRING_FRAME: Readonly<
    Record<SubjectCategory, Readonly<Partial<Record<DirectionalMode, ScaleUnitFrame>>>>
  > = {
    CHARACTER: {
      SINGLE_DIRECTION_POSE_LIBRARY: 'SHEET',
      CORE_DIRECTIONAL_VARIANTS: 'SHEET',
      CUTOUT_RIG_SINGLE_DIRECTION: 'SHEET',
    },
    CREATURE: {
      SINGLE_DIRECTION_POSE_LIBRARY: 'SHEET',
      CORE_DIRECTIONAL_VARIANTS: 'SHEET',
      CUTOUT_RIG_SINGLE_DIRECTION: 'SHEET',
    },
    OBJECT: {
      SINGLE_DIRECTION_POSE_LIBRARY: 'SHEET',
      CORE_DIRECTIONAL_VARIANTS: 'SHEET',
      CUTOUT_RIG_SINGLE_DIRECTION: 'SHEET',
    },
    ITEM: { SINGLE_DIRECTION_POSE_LIBRARY: 'SHEET', CORE_DIRECTIONAL_VARIANTS: 'SHEET' },
    BUILDING: {
      SINGLE_DIRECTION_POSE_LIBRARY: 'SHEET',
      CORE_DIRECTIONAL_VARIANTS: 'SHEET',
      TILESET_MODULAR: 'SHEET',
    },
    VEHICLE: {
      SINGLE_DIRECTION_POSE_LIBRARY: 'SHEET',
      CORE_DIRECTIONAL_VARIANTS: 'SHEET',
      CUTOUT_RIG_SINGLE_DIRECTION: 'SHEET',
    },
    EFFECT: { SINGLE_DIRECTION_POSE_LIBRARY: 'CELL' },
    INTERFACE: { SINGLE_DIRECTION_POSE_LIBRARY: 'SHEET', TILESET_MODULAR: 'SHEET' },
    TERRAIN: { SINGLE_DIRECTION_POSE_LIBRARY: 'CELL', TILESET_MODULAR: 'CELL' },
    PORTRAIT: { SINGLE_DIRECTION_POSE_LIBRARY: 'CELL' },
    ICON: { SINGLE_DIRECTION_POSE_LIBRARY: 'CELL' },
    BACKGROUND: { SINGLE_DIRECTION_POSE_LIBRARY: 'SHEET', TILESET_MODULAR: 'CELL' },
    FONT: { SINGLE_DIRECTION_POSE_LIBRARY: 'CELL' },
  };

  it('answers the scale frame once per pairing, on every sheet of every series', () => {
    for (const category of SUBJECT_CATEGORIES) {
      for (const mode of modesFor(category)) {
        // Every direction set the category offers, because the set decides how many sheets a series
        // holds — an eight-compass core is two, and a frame written into one half of a generated
        // pair would be invisible to a check that only read the first.
        for (const directions of CATEGORY_DIRECTION_SETS[category]) {
          const frames = new Set(sheetSeriesFor(category, mode, directions).map((p) => p.scaleUnitFrame));
          expect(frames.size, `${category} / ${mode} / ${directions}`).toBe(1);
          expect([...frames], `${category} / ${mode} / ${directions}`).toEqual([
            PAIRING_FRAME[category][mode],
          ]);
        }
      }
    }
  });

  it('states a frame for exactly the pairings the plan table holds', () => {
    // The table above is a written-out claim, and this is what keeps it a claim about *this* plan
    // table. A missing pairing fails the assertion above rather than passing — every sheet of that
    // series would be compared against `[undefined]` — but the failure would read as a wrong frame
    // rather than as a mode nobody answered, and a surplus entry left behind by a retired mode would
    // not fail at all. A new mode has to be answered here, which is the point: the frame is a
    // decision about what the sheet draws, not something a new plan inherits.
    for (const category of SUBJECT_CATEGORIES) {
      expect(Object.keys(PAIRING_FRAME[category]).sort(), category).toEqual([...modesFor(category)].sort());
    }
  });

  it('uses both frames, so a table that has collapsed to one is not silently in force', () => {
    const frames = new Set(SUBJECT_CATEGORIES.flatMap((c) => Object.values(PAIRING_FRAME[c])));
    expect(frames).toEqual(new Set(['CELL', 'SHEET']));
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
        `Exactly ${String(componentCountFor(category, mode, DEFAULT_OUTPUT_CONFIG.directions, 0, defaultClothing(category), pieces))} components`,
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
      directionalModeChoices('CHARACTER', DEFAULT_OUTPUT_CONFIG, '', []).map((choice) => choice.value),
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
      const expected = componentCountFor(category, mode, directions, sheetIndex, defaultClothing(category), [
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

/**
 * The counts a plan's prose states, checked against the entries those sentences describe.
 *
 * **The defect this exists for.** A plan's group intros and outros state figures its own entries
 * also state — `Fourteen tiles carrying the boundary`, `a sheet returning six fewer components`,
 * `The same eight variants as the left arm` — and every one of them was written out by hand beside
 * entries summing to the same number. Correct on the day, one edit from a prompt whose prose
 * contradicts its own inventory, and nothing read the words: the count assertion above checks the
 * three places the *compiler* writes the total and never looks at a sentence.
 *
 * The plans derive these now, so the drift is prevented rather than detected. What this suite adds
 * is the check that the derivation is still in place and still produces the figure the entries
 * carry, and it reaches that figure by a second path — summing the entries itself and spelling the
 * result from its own table. What that catches is a figure that *disagrees* with the entries — a
 * derivation replaced by a literal passes while the literal is still right, and fails on the next
 * count change, which is the moment the drift would otherwise reach a prompt.
 *
 * **The table is deliberately small and throws on a miss.** It holds the figures the plans actually
 * produce, so a count that changes to a value nobody has spelled stops the suite with a message
 * naming the number rather than quietly agreeing with whatever the plan now says.
 */
const FIGURE_WORDS: Readonly<Record<number, string>> = {
  2: 'two',
  6: 'six',
  8: 'eight',
  9: 'nine',
  10: 'ten',
  11: 'eleven',
  12: 'twelve',
  14: 'fourteen',
  16: 'sixteen',
  21: 'twenty-one',
  26: 'twenty-six',
};

/** The figure as this suite spells it — its own table, so the check is not the plan's own arithmetic. */
function figureWord(count: number): string {
  const word = FIGURE_WORDS[count];
  if (word === undefined) {
    throw new Error(
      `No spelling for ${String(count)} — add it to FIGURE_WORDS and read the prose it lands in`,
    );
  }
  return word;
}

/** The same word opening a sentence. */
function figureWordCapitalised(count: number): string {
  const word = figureWord(count);
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** Every sheet of one pairing, at the first direction set its category offers. */
function seriesOf(category: SubjectCategory, mode: DirectionalMode): readonly SheetPlan[] {
  const [directions] = CATEGORY_DIRECTION_SETS[category];
  return sheetSeriesFor(category, mode, directions);
}

/** One sheet of a pairing, by the name its inventory heading carries. */
function sheetNamed(category: SubjectCategory, mode: DirectionalMode, name: string): SheetPlan {
  const plan = seriesOf(category, mode).find((sheet) => sheet.name === name);
  if (plan === undefined) throw new Error(`${category}/${mode} has no sheet named ${name}`);
  return plan;
}

/** One group of a sheet, by the heading it renders under. */
function groupNamed(plan: SheetPlan, heading: string | null): ComponentGroup {
  const group = plan.groups.find((candidate) => candidate.heading === heading);
  if (group === undefined) throw new Error(`${plan.name} has no group headed ${heading ?? '(none)'}`);
  return group;
}

/** What a group's entries are worth, summed here rather than taken from the app's own helper. */
function totalOf(group: ComponentGroup): number {
  return group.entries.reduce((total, entry) => total + entry.count, 0);
}

/** The one entry a group holds, where the group exists to carry a single mirrored line. */
function onlyEntryOf(group: ComponentGroup): ComponentEntry {
  const [entry] = group.entries;
  if (entry === undefined || group.entries.length !== 1) {
    throw new Error(
      `expected one entry under ${group.heading ?? '(none)'}, found ${String(group.entries.length)}`,
    );
  }
  return entry;
}

describe('no count in a plan’s prose contradicts the entries it describes', () => {
  it.each([
    { category: 'CHARACTER', mirrored: 'Right arm', from: 'Left arm', limb: 'the left arm' },
    { category: 'CHARACTER', mirrored: 'Right leg', from: 'Left leg', limb: 'the left leg' },
    {
      category: 'CREATURE',
      mirrored: 'Right forelimb',
      from: 'Left forelimb',
      limb: 'the left forelimb',
    },
    {
      category: 'CREATURE',
      mirrored: 'Right hindlimb',
      from: 'Left hindlimb',
      limb: 'the left hindlimb',
    },
  ] as const)('$category’s $mirrored states the total of $from', ({ category, mirrored, from, limb }) => {
    const plan = sheetNamed(category, 'CORE_DIRECTIONAL_VARIANTS', 'Articulation');
    const expected = totalOf(groupNamed(plan, from));
    const entry = onlyEntryOf(groupNamed(plan, mirrored));

    expect(entry.count).toBe(expected);
    expect(entry.text).toBe(
      `The same ${figureWord(expected)} variants as ${limb}, redrawn for the right side`,
    );
  });

  it('numbers EFFECT’s residue frames on from the length of its core run', () => {
    // The residue group continues the core group's own sequence, so the frame it opens on is the
    // core's length plus one. A frame added to the core and not carried here would tell the
    // generator to leave a gap in a run whose whole point is that it has none.
    const plan = sheetNamed('EFFECT', 'SINGLE_DIRECTION_POSE_LIBRARY', 'Frame sequence');
    const core = totalOf(groupNamed(plan, 'Core sequence'));
    const residue = groupNamed(plan, 'Residue and clearing');

    expect(residue.intro).toContain(`frame ${figureWord(core + 1)} follows frame ${figureWord(core)}`);
    expect(residue.outro).toContain(`returning ${figureWord(totalOf(residue))} fewer components`);
  });

  it('counts TERRAIN’s materials, its transition tiles, and the autotiler set they complete', () => {
    // Three sentences on this sheet count the same two lists, and the sixteen is the transitions plus
    // one primary per material — so a third material has to move all three together.
    const plan = sheetNamed('TERRAIN', 'TILESET_MODULAR', 'Blend set');
    const materials = groupNamed(plan, null);
    const transitions = groupNamed(plan, 'Transition set');
    const carried = totalOf(transitions);
    const joined = materials.entries.length;

    expect(materials.intro).toContain(`The ${figureWord(joined)} materials the set joins`);
    expect(transitions.intro).toContain(`${figureWordCapitalised(carried)} tiles carrying the boundary`);
    expect(transitions.intro).toContain(`complete the ${figureWord(carried + joined)} an autotiler indexes`);
    expect(transitions.outro).toContain(`The ${figureWord(joined)} pure tiles`);
  });

  it('states ICON’s family size where the sheet opens, and where a redrawn state is priced', () => {
    const plan = sheetNamed('ICON', 'SINGLE_DIRECTION_POSE_LIBRARY', 'Symbol set');
    const icons = groupNamed(plan, null);
    const family = totalOf(icons);

    expect(icons.intro).toContain(`${figureWordCapitalised(family)} members of the one family`);
    expect(groupNamed(plan, 'State pieces').intro).toContain(
      `costs one component here and ${figureWord(family)}`,
    );
  });

  it('states PORTRAIT’s expression count in the sentence a reader checks the delivery against', () => {
    const plan = sheetNamed('PORTRAIT', 'SINGLE_DIRECTION_POSE_LIBRARY', 'Expression set');
    const expressions = groupNamed(plan, null);

    expect(expressions.outro).toContain(
      `${figureWordCapitalised(totalOf(expressions))} competent portraits that are not recognisably one character`,
    );
  });

  it.each([
    { sheet: 'Capitals', heading: null, opens: 'Latin capitals, in this order' },
    { sheet: 'Lower case', heading: null, opens: 'Latin lower-case letters, in this order' },
    {
      sheet: 'Digits and sentence punctuation',
      heading: 'Digits',
      opens: 'Western Arabic digits, in this order',
    },
    {
      sheet: 'Digits and sentence punctuation',
      heading: 'Sentence punctuation',
      opens: 'marks a sentence is set with',
    },
    {
      sheet: 'Symbols and operators',
      heading: null,
      opens: 'printable ASCII characters the three sheets before this one do not carry',
    },
  ] as const)('counts the glyphs FONT’s $sheet sheet lists under $heading', ({ sheet, heading, opens }) => {
    const group = groupNamed(sheetNamed('FONT', 'SINGLE_DIRECTION_POSE_LIBRARY', sheet), heading);

    expect(group.intro).toContain(`The ${figureWord(totalOf(group))} ${opens}`);
  });
});

/**
 * Where a limb is drawn, as opposed to a trunk piece.
 *
 * Deliberately not `LIMB_VOCABULARY` above, which matches `pelvis` and `hindquarters` — both trunk
 * pieces, and both on the one sheet whose inventory has no limb at all. A probe that answered "yes"
 * there would make the property below vacuous exactly where the defect was.
 */
const LIMB_ENTRY = /\b(arms?|legs?|hands?|feet|foot|forelimbs?|hindlimbs?)\b/i;

describe('the trunk-termination paragraph is true on every sheet that carries it', () => {
  /** The three sheets a category emits it on, and its claim has to hold on all three. */
  const TRUNK_SHEETS = [
    { category: 'CHARACTER', mode: 'CORE_DIRECTIONAL_VARIANTS', sheet: 'Directional core' },
    { category: 'CHARACTER', mode: 'SINGLE_DIRECTION_POSE_LIBRARY', sheet: 'Pose library' },
    { category: 'CHARACTER', mode: 'CUTOUT_RIG_SINGLE_DIRECTION', sheet: 'Rig pieces' },
    { category: 'CREATURE', mode: 'CORE_DIRECTIONAL_VARIANTS', sheet: 'Directional core' },
    { category: 'CREATURE', mode: 'SINGLE_DIRECTION_POSE_LIBRARY', sheet: 'Pose library' },
    { category: 'CREATURE', mode: 'CUTOUT_RIG_SINGLE_DIRECTION', sheet: 'Rig pieces' },
  ] as const;

  /** Every outro on that sheet which is the paragraph, so a moved one fails rather than being skipped. */
  function terminationParagraphs(category: SubjectCategory, mode: DirectionalMode, sheet: string): string[] {
    return sheetNamed(category, mode, sheet)
      .groups.map((group) => group.outro ?? '')
      .filter((outro) => outro.includes('is a severed, isolated piece'));
  }

  it.each(TRUNK_SHEETS)('is emitted on $category’s $sheet sheet', ({ category, mode, sheet }) => {
    // The property below is vacuous if the paragraph has moved or been reworded out of recognition,
    // so its premise is asserted first rather than assumed.
    expect(terminationParagraphs(category, mode, sheet)).toHaveLength(1);
  });

  it('has a sheet whose inventory lists no limb, which is what the old wording was false on', () => {
    // The reported defect: the paragraph read "has merged entries the inventory lists separately",
    // which is true of the pose library and the rig — both of which list the limbs — and false on
    // the directional core, whose inventory is the trunk alone. A real rule justified by a list that
    // sheet does not have. This pins the asymmetry, so the check below is answering something.
    const listsALimb = TRUNK_SHEETS.map(({ category, mode, sheet }) =>
      sheetNamed(category, mode, sheet)
        .groups.flatMap((group) => group.entries)
        .some((entry) => LIMB_ENTRY.test(entry.label) || LIMB_ENTRY.test(entry.text)),
    );

    expect(listsALimb).toStrictEqual([false, true, true, false, true, true]);
  });

  it.each(TRUNK_SHEETS)(
    'justifies the rule by the series rather than by $category’s $sheet own list',
    ({ category, mode, sheet }) => {
      for (const paragraph of terminationParagraphs(category, mode, sheet)) {
        expect(paragraph).toContain('on this sheet or on another of this series');
        expect(paragraph).not.toContain('the inventory lists separately');
      }
    },
  );
});

/**
 * The counts an entry's own line states, against the `count` beside it.
 *
 * `ComponentEntry.count` is carried rather than parsed back out of `text`, for the reason its own
 * docblock gives — a line reading `Wall top corners ×4` is one line and four components, and reading
 * the words to work that out is the arithmetic that used to be done twice. But the line still states
 * the figure, so the two can still disagree, and 112 of the 331 distinct lines state one this way
 * with nothing reading them — 106 with a `×N` marker, 10 with a bare integer, and 4 with both. The group intros and outros derive their counts now; an entry's text is authored, so this is
 * what holds it to the number the compiler will actually contract for.
 *
 * **Two notations, and both are checked.** A `×N` marker is the inventory's own, and where a line
 * carries several they enumerate its parts — `Fittings: handle ×1, latch or catch ×1, mounting
 * bracket ×2` is one line and four components — so they have to sum to the count. A bare integer is
 * the character and creature pose libraries' spelling, where a line either opens on its own total
 * (`8 left-arm articulation variants`) or lists its pieces (`1 head, 1 torso, 1 pelvis`), so either
 * the first equals the count or all of them sum to it.
 */
const CROSS_MARKER = /×(\d+)/g;

/**
 * A bare integer that is not a `×` marker and is followed by a space.
 *
 * The trailing `(?=\s)` is what keeps the codepoint lines out, and it is worth stating plainly
 * because the obvious reading of it is wrong: `Full stop — U+002E` is skipped because `002` is
 * followed by `E`, but `Exclamation mark — U+0021` and every `Digit 0`…`Digit 9` line are skipped
 * only because the figure ends the string. So the rule this encodes is **a figure at the end of a
 * line is never read**, and a line like `Wall segments 4` against a `count` of 5 would go unchecked.
 * None exists today; a new one would need this widened rather than trusted.
 */
const BARE_FIGURE = /(?:^|[^×\w])(\d+)(?=\s)/g;

/**
 * The one line whose `×` markers deliberately do not cover it, and why.
 *
 * `Slider track ×1, slider handle: at rest, held` is worth three components: one track, and a handle
 * drawn in two states. The marker prices the track alone and the handle is enumerated by naming its
 * states, which is how every unmarked line in the directory reads — so the markers sum to one where
 * the count is three, and the line is right. Adding `×2` to it would be rewriting prompt text to
 * suit a test rather than to say anything a generator does not already read off `at rest, held`.
 *
 * It buys the exemption at the cost of covering that line, which is the trade an exemption always
 * is. The guard below keeps it honest: an entry listed here that no longer needs it fails.
 */
const UNMARKED_REMAINDER = ['Slider track ×1, slider handle: at rest, held'];

/**
 * Every distinct inventory line the table produces, whatever pairing or direction set reaches it.
 *
 * Keyed on the text because the directional plans are functions of the chosen facings, so one
 * authored line arrives once per set — deduplicating keeps a failure report readable without
 * narrowing what is walked.
 */
function everyEntryText(): readonly ComponentEntry[] {
  const seen = new Map<string, ComponentEntry>();
  for (const category of SUBJECT_CATEGORIES) {
    for (const mode of modesFor(category)) {
      for (const directions of CATEGORY_DIRECTION_SETS[category] as readonly DirectionSet[]) {
        for (const plan of sheetSeriesFor(category, mode, directions)) {
          for (const entry of plan.groups.flatMap((group) => group.entries)) {
            if (!seen.has(entry.text)) seen.set(entry.text, entry);
          }
        }
      }
    }
  }
  return [...seen.values()];
}

/** The figures a line states in one notation. */
function figuresIn(text: string, pattern: RegExp): number[] {
  return [...text.matchAll(pattern)].map(([, digits]) => Number(digits));
}

/** Whether this line's `×` markers account for its count. */
function crossMarkersAgree(entry: ComponentEntry): boolean {
  const markers = figuresIn(entry.text, CROSS_MARKER);
  if (markers.length === 0) return true;
  return markers.reduce((total, marker) => total + marker, 0) === entry.count;
}

describe('an inventory line states the count the compiler contracts for', () => {
  it('reads a corpus rather than a handful', () => {
    // Every check below filters this list, so a walk that returned nothing would pass all of them
    // while reading no inventory at all.
    expect(everyEntryText().length).toBeGreaterThan(300);
  });

  it('sums every ×N marker on a line to that line’s own count', () => {
    const offenders = everyEntryText()
      .filter((entry) => !UNMARKED_REMAINDER.includes(entry.text))
      .filter((entry) => !crossMarkersAgree(entry))
      .map((entry) => `${entry.text} [count ${String(entry.count)}]`);

    expect(offenders).toStrictEqual([]);
  });

  it('reads every bare figure on a line as its total or as one of its pieces', () => {
    const offenders = everyEntryText()
      .filter((entry) => {
        const figures = figuresIn(entry.text, BARE_FIGURE);
        if (figures.length === 0) return false;
        const summed = figures.reduce((total, figure) => total + figure, 0);
        return summed !== entry.count && figures[0] !== entry.count;
      })
      .map((entry) => `${entry.text} [count ${String(entry.count)}]`);

    expect(offenders).toStrictEqual([]);
  });

  it('still has a line behind the exemption it grants', () => {
    // An exemption that has stopped suppressing anything is a hole: it reads as a standing
    // permission while covering nothing. Each entry earns its place by still being a line the rule
    // above would otherwise report.
    const exercised = UNMARKED_REMAINDER.filter((text) => {
      const entry = everyEntryText().find((candidate) => candidate.text === text);
      return entry !== undefined && !crossMarkersAgree(entry);
    });

    expect(exercised).toStrictEqual(UNMARKED_REMAINDER);
  });
});
