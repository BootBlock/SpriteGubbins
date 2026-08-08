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
    expect(splitsIntoFacingRuns(EIGHT_WAY_RIG)).toBe(true);
    expect(splitsIntoFacingRuns({ ...EIGHT_WAY_RIG, directions: 'SINGLE_FRONT' })).toBe(false);
    // The mode names its own five facings, so the chosen set buys no runs at all — whatever it says.
    // That mode still splits, by the *other* axis: two sheets of one series, counted below.
    expect(splitsIntoFacingRuns({ ...EIGHT_WAY_RIG, directionalMode: 'CORE_DIRECTIONAL_VARIANTS' })).toBe(
      false,
    );
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
