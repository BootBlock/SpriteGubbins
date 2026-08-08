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
import { DIRECTION_COVERAGE } from '../constants/promptText/index.ts';
import { DIRECTIONAL_MODES } from '../types/output.ts';
import type { DirectionalMode } from '../types/output.ts';
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

/** Vocabulary that belongs only to an environment/tile sheet. */
const TILE_VOCABULARY =
  /floor ×|wall top|wall face|floor edge trim|every tile is seamless|continuous floor field|straight wall run/i;

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
  sheetIndex: number;
  sheet: string;
}[] = SUBJECT_CATEGORIES.flatMap((category) =>
  modesFor(category).flatMap((mode) =>
    sheetSeriesFor(category, mode).map((plan, sheetIndex) => ({
      category,
      mode,
      sheetIndex,
      sheet: plan.name,
    })),
  ),
);

function promptFor(
  category: SubjectCategory,
  mode: DirectionalMode,
  additional?: string,
  sheetIndex = 0,
): string {
  const subject = {
    ...defaultSubjectFor(category),
    additional_anatomy: additional ?? NO_ADDITIONAL_ANATOMY,
  };
  return generatePrompt(category, subject, {
    ...DEFAULT_OUTPUT_CONFIG,
    directionalMode: mode,
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

  it('gives the tileset to the one category that is an environment, and to no other', () => {
    // BUILDING is labelled "Building / Environment Tile"; a tile field is the right answer there and
    // nowhere else. This is the exact pairing the reported defect produced for a CHARACTER.
    const withTileset = SUBJECT_CATEGORIES.filter((c) => supportsMode(c, 'TILESET_MODULAR'));
    expect(withTileset).toEqual(['BUILDING']);
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
    // none of. What a *directional* effect needs is this mode plus a direction set, which
    // `'primary'` coverage reads as a run list: eight frame sequences, not one sheet of eight frames.
    expect(modesFor('EFFECT')).toEqual(['SINGLE_DIRECTION_POSE_LIBRARY']);
    expect(DIRECTION_COVERAGE.SINGLE_DIRECTION_POSE_LIBRARY).toBe('primary');
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
      inventory:
        /## 4\. COMPONENT INVENTORY[\s\S]*?## 5|## 4\. COMPONENT INVENTORY[\s\S]*?## 6/.exec(prompt)?.[0] ??
        '',
      exclusions: /## 8\. EXCLUSIONS[\s\S]*?---/.exec(prompt)?.[0] ?? '',
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
    expect(inventory).toContain('Secondary layer — 6');
    expect(inventory).toContain('The trailing layer the subject names');
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
    const exclusions = /## 8\. EXCLUSIONS[\s\S]*?---/.exec(prompt)?.[0] ?? '';
    const inventory = /## 4\. COMPONENT INVENTORY[\s\S]*?## 5|## 4\. COMPONENT INVENTORY[\s\S]*?## 6/
      .exec(prompt)?.[0]
      ?.toLowerCase();

    expect(exclusions).toContain('any particle');
    expect(inventory).not.toContain('particle');
    expect(inventory).not.toContain('spark');
  });
});

describe('no category emits another category’s components', () => {
  it.each(SHEETS)('$category / $mode / $sheet', ({ category, mode, sheetIndex }) => {
    const prompt = promptFor(category, mode, undefined, sheetIndex);
    const inventory = /## 4\. COMPONENT INVENTORY[\s\S]*?## 5|## 4\. COMPONENT INVENTORY[\s\S]*?## 6/.exec(
      prompt,
    );
    expect(inventory).not.toBeNull();
    const section = inventory?.[0] ?? '';

    // Both halves are derived from `PERMITTED_KINDS` rather than from a list of category names, and
    // that is the fix rather than the tidy-up: the limb half used to read `category === 'OBJECT' ||
    // category === 'ITEM'`, so VEHICLE — which holds exactly OBJECT's `['structure', 'mechanism']`
    // pair — joined this suite running only the tile half. It passed, because the vehicle plans
    // happen to name no limbs, and nothing said the other half had stopped being asserted. A list
    // of names cannot notice a seventh category; the kinds table has to answer for one.
    //
    // `validateAllSheetPlans` does not make this redundant. `kind` is hand-assigned per entry, so
    // `{ text: 'Left leg ×1', kind: 'structure' }` satisfies the structural check and only the prose
    // net catches it — which is why the two run side by side.
    if (!PERMITTED_KINDS[category].includes('anatomy')) {
      expect(section).not.toMatch(LIMB_VOCABULARY);
    }
    if (!PERMITTED_KINDS[category].includes('tile')) {
      expect(section).not.toMatch(TILE_VOCABULARY);
    }
  });
});

describe('the reported failure: a CHARACTER asked for a tileset', () => {
  const CYBORG = 'Demon Horn ×2, Tail ×1';

  it('cannot be configured at all — the mode is not offered to a character', () => {
    expect(supportsMode('CHARACTER', 'TILESET_MODULAR')).toBe(false);
    expect(directionalModeChoices('CHARACTER', []).map((choice) => choice.value)).not.toContain(
      'TILESET_MODULAR',
    );
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
    const prompt = promptFor('CHARACTER', 'TILESET_MODULAR', CYBORG);
    expect(prompt).toContain('- Demon Horn ×2.');
    expect(prompt).toContain('- Tail ×1.');
    expect(prompt).toContain('#### Additional anatomy — 3');
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
    const exclusions = /## 8\. EXCLUSIONS[\s\S]*?---/.exec(prompt)?.[0] ?? '';

    expect(exclusions).not.toContain('floor tiles');
    expect(exclusions).toContain('Characters, creatures, vehicles');
  });

  it('still forbids scenery on a character sheet', () => {
    const exclusions =
      /## 8\. EXCLUSIONS[\s\S]*?---/.exec(promptFor('CHARACTER', 'CORE_DIRECTIONAL_VARIANTS'))?.[0] ?? '';
    expect(exclusions).toContain('floor tiles');
  });
});

describe('the declared count is the inventory’s own length', () => {
  it.each(SHEETS)('$category / $mode / $sheet', ({ category, mode, sheetIndex, sheet }) => {
    const prompt = promptFor(category, mode, 'Demon Horn ×2, Tail ×1', sheetIndex);
    const expected = componentCountFor(category, mode, sheetIndex, [
      { name: 'Demon Horn', count: 2 },
      { name: 'Tail', count: 1 },
    ]);

    // Stated four times over; all four are the same sum or the sheet is silently wrong.
    expect(prompt).toContain(`Exactly ${String(expected)} components`);
    expect(prompt).toContain(`### Component inventory: ${sheet} — ${String(expected)} in total`);
    expect(prompt).toContain(`Component count is exactly ${String(expected)}.`);
  });
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
