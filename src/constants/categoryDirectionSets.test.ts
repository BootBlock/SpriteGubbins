import { describe, expect, it } from 'vitest';
import { DIRECTION_SETS } from '../types/rendering.ts';
import { SUBJECT_CATEGORIES } from '../types/subject.ts';
import {
  CATEGORY_DIRECTION_SETS,
  resolveDirectionSet,
  supportsDirectionSet,
} from './categoryDirectionSets.ts';
import { directionSetChoices } from './output/directionSetChoices.ts';
import { DIRECTION_COVERAGE } from './promptText/index.ts';
import { modesFor } from './sheetPlans/index.ts';

/**
 * Which facings each category's subject can be drawn to.
 *
 * The defect: `CATEGORY_SHEET_PLANS` related a category to the *kinds of sheet* it can produce and
 * nothing related it to the *facings*, so a category switch re-resolved the mode and left the
 * direction set exactly where it was. An INTERFACE arrived from a default session still holding
 * `THREE_CLASSIC`, the studio offered "Split into 3 sheets", and each run asked for a button at an
 * object yaw a button does not have.
 *
 * What these pin is the property rather than the example — a category may only be offered a set its
 * subject can honestly be turned to, and a stored set outside that must degrade rather than compile.
 */
describe('the table itself', () => {
  it.each(SUBJECT_CATEGORIES)('%s offers at least one set, and a facing for it', (category) => {
    // A category with an empty pool would leave `resolveDirectionSet` with no fallback to name and
    // the studio's select with no option to render.
    expect(CATEGORY_DIRECTION_SETS[category].length).toBeGreaterThan(0);
    expect(directionSetChoices(category).length).toBeGreaterThan(0);
  });

  it('binds exactly the two categories whose subject has no front', () => {
    // INTERFACE is a flat widget read straight on; a TERRAIN tile is laid flat and read from above,
    // and `LANDMARK_TEXT.TERRAIN` says it has no front in as many words. Both are the *unambiguous*
    // cases, which is what makes naming them here worth more than deriving them: the interesting
    // half of the decision is who is left out.
    const bound = SUBJECT_CATEGORIES.filter(
      (category) => CATEGORY_DIRECTION_SETS[category].length < DIRECTION_SETS.length,
    );
    expect(bound).toEqual(['INTERFACE', 'TERRAIN']);
    for (const category of bound) {
      expect(CATEGORY_DIRECTION_SETS[category]).toEqual(['SINGLE_FRONT']);
    }
  });

  it('leaves EFFECT every set, because a directional slash is genuinely eight runs', () => {
    // The category this table must *not* bind, and the reason the fix is a per-category statement
    // rather than a rule about which modes read a set. A radial burst has no facing; a slash does,
    // and `sheetPlans/effect.ts` gives the category its single mode precisely so that a direction
    // set becomes a run list of frame sequences. Pinning EFFECT would delete that deliverable.
    expect(CATEGORY_DIRECTION_SETS.EFFECT).toEqual(DIRECTION_SETS);
    expect(supportsDirectionSet('EFFECT', 'EIGHT_COMPASS')).toBe(true);
  });

  it('leaves no set of the union unreachable', () => {
    // A set nothing can select would be dead weight in stored data, in `configParsers`' validation
    // and in the tooltip that explains when to choose it.
    for (const set of DIRECTION_SETS) {
      const owners = SUBJECT_CATEGORIES.filter((category) => supportsDirectionSet(category, set));
      expect(owners.length, `${set} belongs to no category`).toBeGreaterThan(0);
    }
  });

  it('never lets a mode draw a set its own category is not offered', () => {
    // The invariant that makes the restriction total, and the one place the two tables have to
    // agree. A mode with a *named* coverage — `CORE_DIRECTIONAL_VARIANTS` draws `FIVE_CLASSIC`
    // whatever the control says — reaches the sheet without passing through `resolveDirectionSet`
    // at all, so a category holding both that mode and a narrower pool would draw five facings of a
    // subject this table says has one. It holds today because the two bound categories support only
    // `'primary'` modes; nothing but this says it has to keep holding.
    for (const category of SUBJECT_CATEGORIES) {
      for (const mode of modesFor(category)) {
        const coverage = DIRECTION_COVERAGE[mode];
        if (coverage === 'primary') continue;
        expect(supportsDirectionSet(category, coverage), `${category} / ${mode}`).toBe(true);
      }
    }
  });
});

describe('resolveDirectionSet', () => {
  it('keeps a set the subject can be turned to', () => {
    // Seven of the nine categories can be turned to all of them, so for those this is every case.
    expect(resolveDirectionSet('CHARACTER', 'EIGHT_COMPASS')).toBe('EIGHT_COMPASS');
    expect(resolveDirectionSet('EFFECT', 'FOUR_CARDINAL')).toBe('FOUR_CARDINAL');
    expect(resolveDirectionSet('INTERFACE', 'SINGLE_FRONT')).toBe('SINGLE_FRONT');
  });

  it('degrades a stored set the subject has no facing for', () => {
    // A preset written before this table existed, a history row from an older build, or a
    // hand-edited export can all carry one — exactly as `resolveMode` answers for a stored mode.
    expect(resolveDirectionSet('INTERFACE', 'THREE_CLASSIC')).toBe('SINGLE_FRONT');
    expect(resolveDirectionSet('TERRAIN', 'EIGHT_COMPASS')).toBe('SINGLE_FRONT');
  });

  it('always answers with a set the category actually offers', () => {
    // The property `sheetDirections`, the batch and the studio's select all rely on: whatever
    // arrives, what comes back is selectable and drawable.
    for (const category of SUBJECT_CATEGORIES) {
      for (const set of DIRECTION_SETS) {
        expect(supportsDirectionSet(category, resolveDirectionSet(category, set))).toBe(true);
      }
    }
  });
});

describe('directionSetChoices', () => {
  it('offers a category only what it can be turned to', () => {
    expect(directionSetChoices('INTERFACE').map((choice) => choice.value)).toEqual(['SINGLE_FRONT']);
    expect(directionSetChoices('TERRAIN').map((choice) => choice.value)).toEqual(['SINGLE_FRONT']);
    expect(directionSetChoices('CHARACTER')).toHaveLength(DIRECTION_SETS.length);
  });

  it('leads with the set most sheets want, not with the table’s fallback', () => {
    // The two orders answer different questions and neither is derived from the other: the select
    // leads with `THREE_CLASSIC` because it is the studio's opening set, while the table leads with
    // `SINGLE_FRONT` because that is what an unhonourable stored set degrades to.
    expect(directionSetChoices('CHARACTER')[0]?.value).toBe('THREE_CLASSIC');
    expect(CATEGORY_DIRECTION_SETS.CHARACTER[0]).toBe('SINGLE_FRONT');
  });
});
