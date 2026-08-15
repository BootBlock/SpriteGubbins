import { describe, expect, it } from 'vitest';
import { NO_ADDITIONAL_ANATOMY } from '../constants/anatomy.ts';
import { defaultSubjectFor } from '../constants/categories/index.ts';
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
import { CATEGORY_EXCLUSION_TEXT, DIRECTION_LISTS, OBJECT_YAW } from '../constants/promptText/index.ts';
import { DIRECTIONAL_MODES } from '../types/output.ts';
import type { DirectionalMode } from '../types/output.ts';
import type { DirectionSet } from '../types/rendering.ts';
import { SUBJECT_CATEGORIES } from '../types/subject.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';
import { componentCountFor } from './componentSet.ts';
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
 * One section of a compiled prompt, found by its heading's **title** and running to the next
 * heading.
 *
 * Section numbers are computed from the headings a configuration actually carries, so a literal
 * `## 8. EXCLUSIONS` is right only for the categories that also carry a rig section — the five that
 * articulate about nothing put their exclusions at 7. Every slice here was previously written as a
 * number, and the inventory's was written as a *disjunction* over the two numbers the following
 * heading could take, which is the hand-maintained arithmetic `applySectionNumbers` removed.
 *
 * `\n## ` terminates rather than the `---` rule, because a section's own sub-headings are three
 * hashes or four and the rule is not present between every pair. The end of the *prompt* is spelled
 * `(?![\s\S])` rather than `$`, which under the `m` flag needed for `^` would mean the end of the
 * heading's own line and match every section as its heading alone.
 */
function sectionOf(prompt: string, title: string): string {
  const pattern = String.raw`^## \d+\. ${title}$[\s\S]*?(?=\n## |(?![\s\S]))`;
  return new RegExp(pattern, 'm').exec(prompt)?.[0] ?? '';
}

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

  it('gives the tileset only to the categories that assemble from repeating pieces', () => {
    // BUILDING is labelled "Building / Environment Tile", INTERFACE ships a nine-slice whose corners
    // are fixed while its edges and centre repeat and butt against copies of themselves, and
    // TERRAIN's blend set is the ground the first of those stands on — which is what this mode
    // means. Every other category is a *subject* rather than a field of pieces, and a CHARACTER
    // reaching this mode is the exact pairing the reported defect produced.
    const withTileset = SUBJECT_CATEGORIES.filter((c) => supportsMode(c, 'TILESET_MODULAR'));
    expect(withTileset).toEqual(['BUILDING', 'INTERFACE', 'TERRAIN']);
  });

  it('exempts exactly the categories whose components are the environment', () => {
    // The guard on `BANS_AN_ENVIRONMENT` above. It is derived by matching prose, so a reword of one
    // exclusion line could empty it and take the check below with it, silently — this is what makes
    // that loud. BUILDING and TERRAIN are the exemptions, and they are the only ones: a building
    // tileset's inventory *is* floor tiles and a terrain's *is* the ground plane, which is why their
    // section 8 bans inhabitants and clutter instead. INTERFACE is not among them — a nine-slice
    // repeats, but a panel frame is not an environment, so it bans one like everything else.
    const exempt = SUBJECT_CATEGORIES.filter((c) => !BANS_AN_ENVIRONMENT.includes(c));
    expect(exempt).toEqual(['BUILDING', 'TERRAIN']);
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
    // Section 1 says every applied attribute is painted onto the component it sits on, and names the
    // additional-elements field as the *single* exception. Breaking the subject's secondary layer
    // out into six components of its own would have made that sentence false — so the tail of the
    // sequence is more frames, never a second layer to composite.
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

  it('does not call the subject’s own additional elements an error in the specification', () => {
    // EFFECT is the only category whose additional-anatomy field holds something that is *not* the
    // kind its components are: a character's extra horn is still anatomy and a vehicle's extra pod
    // is still a part, so those guards stay true above the appended block. A shockwave ring is not
    // a frame — and §4's guard tells the reader that an entry which does not belong "is an error in
    // this specification, not an instruction to follow", while §9's audit is a check they perform.
    // Unqualified, both would condemn components §4 had just required, which is the §4-requires /
    // §9-forbids contradiction the per-category records exist to remove. Five of the eight shipped
    // EFFECT presets name additional elements, so this shipped in the box or not at all.
    const subject = { ...defaultSubjectFor('EFFECT'), additional_anatomy: 'Shockwave Ring ×1' };
    const { prompt, inventory } = sectionsOf(subject);

    expect(inventory).toContain('- Shockwave Ring ×1.');
    expect(prompt).toContain('Exactly 17 components');
    for (const exempting of [
      'apart from the additional elements the subject itself named',
      'or one of the additional elements the subject named',
    ]) {
      expect(prompt).toContain(exempting);
    }
    // The unqualified forms are what made §4 and §9 contradict each other. Both negatives name the
    // *join* the exemption clause was spliced into rather than a whole sentence, so dropping the
    // clause trips them — a negative written against a sentence nobody would regress to would assert
    // nothing at all.
    expect(prompt).not.toContain('not a piece of a machine. An entry describing');
    expect(prompt).not.toContain('Every component is a frame of this one effect —');
  });

  it('still bans the source the effect plays against, which is this category’s own hazard', () => {
    // Asked for a muzzle flash, a generator draws the gun; asked for an impact spark, the thing
    // being hit. Neither is scenery, so the environment ban the other categories carry misses both.
    const { exclusions } = sectionsOf(defaultSubjectFor('EFFECT'));
    expect(exclusions).toContain('weapon, muzzle, projectile or object the effect plays against');
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
      directionalModeChoices('CHARACTER', 'FIVE_CLASSIC', []).map((choice) => choice.value),
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
