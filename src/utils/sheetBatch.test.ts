import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DIRECTION_LISTS } from '../constants/promptText/index.ts';
import type { OutputConfig } from '../types/output.ts';
import { sheetBatch, sheetRunCount, splitsIntoFacingRuns } from './sheetBatch.ts';
import { sheetRuns } from './sheetRuns.ts';

/**
 * What batch a configuration is, and where in it the configuration itself sits.
 *
 * The second half is what the prompt needs and what nothing answered before: a sheet out of a batch
 * used to describe itself as the whole deliverable, so sheet three of eight arrived claiming a
 * component count and an assembly capability belonging to something else. The ordinal is only worth
 * stating if it is the *same* number the split drawer counts off, so the assertion that matters most
 * here is the one that walks `sheetRuns` and asks the batch where each run thinks it is.
 */
const SUBJECT = defaultSubjectFor('CHARACTER');

/** The studio's opening configuration, with only the named fields moved. */
function withOutput(overrides: Partial<OutputConfig>): OutputConfig {
  return { ...DEFAULT_OUTPUT_CONFIG, ...overrides };
}

/** A cut-out rig over all eight compass points: the batch that splits along the facing axis. */
const EIGHT_WAY_RIG = withOutput({
  directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
  rigMode: 'CUTOUT_RIG',
  directions: 'EIGHT_COMPASS',
});

/** A character's five-view core and its limbs: the batch that splits along the series axis. */
const TWO_SHEET_SERIES = withOutput({ directionalMode: 'CORE_DIRECTIONAL_VARIANTS' });

/** One whole deliverable in one generation — the case whose prompt must not change at all. */
const SINGLE_SHEET = withOutput({
  directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
  directions: 'SINGLE_FRONT',
});

describe('splitsIntoFacingRuns', () => {
  it('is true only for a run list: one facing at a time, over a set naming more than one', () => {
    expect(splitsIntoFacingRuns('CHARACTER', EIGHT_WAY_RIG)).toBe(true);
    expect(splitsIntoFacingRuns('CHARACTER', { ...EIGHT_WAY_RIG, directions: 'SINGLE_FRONT' })).toBe(false);
    // The mode names its own five facings, so the chosen set buys no runs at all — whatever it says.
    // That mode still splits, by the *other* axis: two sheets of one series, counted below.
    expect(
      splitsIntoFacingRuns('CHARACTER', { ...EIGHT_WAY_RIG, directionalMode: 'CORE_DIRECTIONAL_VARIANTS' }),
    ).toBe(false);
  });
});

describe('sheetRunCount', () => {
  it('multiplies the two axes, and counts them without compiling anything', () => {
    // A rig is one sheet over eight facings; a character's directional core is two sheets over one.
    // The count is what the studio's split button reads on every keystroke, so it has to agree with
    // the list without paying to compile it.
    expect(sheetRunCount('CHARACTER', EIGHT_WAY_RIG)).toBe(DIRECTION_LISTS.EIGHT_COMPASS.length);
    expect(sheetRunCount('CHARACTER', TWO_SHEET_SERIES)).toBe(2);
    // An OBJECT's five views are thirty components, which fits one sheet — so the same mode is a
    // batch for one category and a single generation for another.
    expect(sheetRunCount('OBJECT', TWO_SHEET_SERIES)).toBe(1);
    expect(sheetRunCount('CHARACTER', SINGLE_SHEET)).toBe(1);
  });

  it('resolves the mode on both axes, so an unsupported pairing cannot be split by a set it discards', () => {
    // An ITEM has no cut-out rig, so the compiler resolves the pairing to that category's default —
    // which covers its own facings and ignores `primaryDirection` entirely. Counting the facings from
    // the *stored* mode while counting the sheets from the resolved one offered eight runs whose
    // prompts were byte-identical, and one copy ticked all eight off.
    expect(sheetRunCount('ITEM', EIGHT_WAY_RIG)).toBe(1);
    expect(sheetRuns('ITEM', SUBJECT, EIGHT_WAY_RIG)).toHaveLength(1);
    expect(sheetBatch('ITEM', EIGHT_WAY_RIG).ordinal).toBe(1);
  });
});

describe('sheetBatch — where the configuration sits in its own batch', () => {
  it('counts the facing axis in the order the direction set lists it', () => {
    for (const [index, facing] of DIRECTION_LISTS.EIGHT_COMPASS.entries()) {
      const batch = sheetBatch('CHARACTER', { ...EIGHT_WAY_RIG, primaryDirection: facing });
      expect(batch.ordinal, facing).toBe(index + 1);
      expect(batch.sheets).toHaveLength(8);
    }
  });

  it('counts the series axis in plan order', () => {
    expect(sheetBatch('CHARACTER', { ...TWO_SHEET_SERIES, sheetIndex: 0 }).ordinal).toBe(1);
    expect(sheetBatch('CHARACTER', { ...TWO_SHEET_SERIES, sheetIndex: 1 }).ordinal).toBe(2);
  });

  it('takes an unset facing as the set’s first, exactly as the prompt does', () => {
    // `primaryDirection` is nullable so that "the set's first" survives the set changing underneath
    // it. A batch that could not resolve that would report the studio's opening configuration as
    // sheet zero of eight.
    expect(sheetBatch('CHARACTER', { ...EIGHT_WAY_RIG, primaryDirection: null }).ordinal).toBe(1);
    // And a facing the set no longer contains resolves the same way, rather than falling off the end.
    expect(
      sheetBatch('CHARACTER', {
        ...EIGHT_WAY_RIG,
        directions: 'THREE_CLASSIC',
        primaryDirection: 'north-east',
      }).ordinal,
    ).toBe(1);
  });

  it('reports the same position the split drawer counts off', () => {
    // The assertion the whole feature rests on. The drawer numbers its rows `index + 1` from
    // `sheetRuns`, and each row's prompt states an ordinal derived here from that row's own
    // configuration — so a batch whose ordering and whose lookup disagreed would print "Sheet 3 of 8"
    // above a prompt announcing itself as sheet five.
    for (const config of [EIGHT_WAY_RIG, TWO_SHEET_SERIES, SINGLE_SHEET]) {
      const runs = sheetRuns('CHARACTER', SUBJECT, config);
      for (const [index, run] of runs.entries()) {
        const batch = sheetBatch('CHARACTER', run.output);
        expect(batch.ordinal, `${String(index)} of ${String(runs.length)}`).toBe(index + 1);
        expect(batch.sheets).toHaveLength(runs.length);
      }
    }
  });

  it('is one sheet of one, for a configuration that is a whole deliverable', () => {
    const batch = sheetBatch('CHARACTER', SINGLE_SHEET);
    expect(batch.sheets).toHaveLength(1);
    expect(batch.ordinal).toBe(1);
  });
});

/**
 * The reported failure: three sheets of a button, each turned to a yaw a button does not have.
 *
 * Switching the studio's category from a default session re-resolved the sheet mode and left
 * `directions` on `THREE_CLASSIC`, because nothing related a direction set to a category. The panel
 * offered "Split into 3 sheets", and the first run compiled `Directions required: Front-three-quarter`
 * above `object yaw 45°`.
 *
 * The two categories here are the ones whose subject has no facing at all. They are also the ones
 * that cannot honour the app's default *mode*, which is why the degenerate batch was one click away
 * rather than something to be asked for: `resolveMode` substitutes on the first switch, and before
 * this the set beside it did not move.
 */
describe('a subject with no facing is one sheet, whatever set the configuration arrived with', () => {
  const TURNED = withOutput({ directions: 'THREE_CLASSIC', primaryDirection: 'front-three-quarter' });

  it.each(['INTERFACE', 'TERRAIN'] as const)('%s is not split into a run per facing', (category) => {
    expect(splitsIntoFacingRuns(category, TURNED)).toBe(false);
    expect(sheetRunCount(category, TURNED)).toBe(1);
    expect(sheetBatch(category, TURNED).ordinal).toBe(1);
  });

  it.each(['INTERFACE', 'TERRAIN'] as const)('%s draws its one sheet front on', (category) => {
    const [sheet] = sheetBatch(category, TURNED).sheets;
    expect(sheet?.covered).toEqual(['front']);
    expect(sheet?.assembly).toBe('front');
  });

  it.each(['INTERFACE', 'TERRAIN'] as const)('%s asks for no yaw it does not have', (category) => {
    const [run, ...rest] = sheetRuns(category, defaultSubjectFor(category), TURNED);
    expect(rest).toEqual([]);

    const prompt = run?.promptText ?? '';
    // The two lines the report quotes, and their replacements. `object yaw 0°` is the whole point:
    // section 3 states the rotation as a figure, so a facing the subject cannot take is not a
    // wording problem but a number the generator will act on.
    expect(prompt).toContain('Directions required: Front');
    expect(prompt).toContain('object yaw 0°');
    expect(prompt).not.toContain('Front-three-quarter');
    expect(prompt).not.toContain('object yaw 45°');
  });

  it('still splits a CHARACTER on the same configuration, which is what makes the fix per category', () => {
    // The negative that stops this being a rule about direction sets in general: the set is
    // meaningful wherever the subject has a front, and a rig worked through three facings is the
    // deliverable the run list exists for.
    const rig = { ...TURNED, directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION' } as const;
    expect(splitsIntoFacingRuns('CHARACTER', rig)).toBe(true);
    expect(sheetRunCount('CHARACTER', rig)).toBe(DIRECTION_LISTS.THREE_CLASSIC.length);
    // And an EFFECT, which is the case that decided the table binds two categories and not three:
    // a directional slash is genuinely one frame sequence per facing.
    expect(sheetRunCount('EFFECT', { ...TURNED, directions: 'EIGHT_COMPASS' })).toBe(
      DIRECTION_LISTS.EIGHT_COMPASS.length,
    );
  });
});
