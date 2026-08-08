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
import { DIRECTIONAL_MODES } from '../types/output.ts';
import type { DirectionalMode } from '../types/output.ts';
import { SUBJECT_CATEGORIES } from '../types/subject.ts';
import type { SubjectCategory } from '../types/subject.ts';
import { componentCountFor } from './componentSet.ts';
import { generatePrompt } from './promptCompiler.ts';
import { PERMITTED_KINDS, validateAllSheetPlans } from './sheetPlanValidation.ts';

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

  it('gives the tileset to the categories that are laid as a field, and to no other', () => {
    // The two categories whose deliverable repeats: BUILDING, labelled "Building / Environment
    // Tile", and TERRAIN, whose blend set is the ground those buildings stand on. A tile field is
    // the right answer for those two and wrong everywhere else — this is the exact pairing the
    // reported defect produced for a CHARACTER. Written as the whole list rather than as two
    // `supportsMode` assertions, so a further category quietly acquiring a tileset fails here.
    const withTileset = SUBJECT_CATEGORIES.filter((c) => supportsMode(c, 'TILESET_MODULAR'));
    expect(withTileset).toEqual(['BUILDING', 'TERRAIN']);
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
