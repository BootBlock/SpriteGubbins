import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DIRECTION_LISTS } from '../constants/promptText/index.ts';
import type { OutputConfig } from '../types/output.ts';
import { sheetBatch, sheetRunCount } from './sheetBatch.ts';
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

/** A cut-out rig over all eight compass points: a batch that is nothing but facing runs. */
const EIGHT_WAY_RIG = withOutput({
  directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
  rigMode: 'CUTOUT_RIG',
  directions: 'EIGHT_COMPASS',
});

/** A character's five-view core and its limbs: a multi-view sheet followed by a run sheet. */
const CORE_SERIES = withOutput({ directionalMode: 'CORE_DIRECTIONAL_VARIANTS' });

/** The five-classic facings, which is the set `CORE_SERIES` inherits from the default config. */
const CORE_FACINGS = DIRECTION_LISTS.FIVE_CLASSIC;

/** One whole deliverable in one generation — the case whose prompt must not change at all. */
const SINGLE_SHEET = withOutput({
  directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
  directions: 'SINGLE_FRONT',
});

describe('sheetRunCount', () => {
  it('expands each run sheet once per facing, and counts without compiling anything', () => {
    // A rig is one run sheet over eight facings. A character's directional pairing is one core
    // sheet plus the articulation run over each of the five classic facings — the limbs are drawn
    // per facing now, because a front-facing limb cannot hang on a side-facing trunk.
    expect(sheetRunCount('CHARACTER', EIGHT_WAY_RIG)).toBe(DIRECTION_LISTS.EIGHT_COMPASS.length);
    expect(sheetRunCount('CHARACTER', CORE_SERIES)).toBe(1 + CORE_FACINGS.length);
    // An OBJECT's directional views have no articulation behind them, so the same mode is a single
    // generation there.
    expect(sheetRunCount('OBJECT', CORE_SERIES)).toBe(1);
    expect(sheetRunCount('CHARACTER', SINGLE_SHEET)).toBe(1);
  });

  it('splits the eight-compass core across a cardinal and a diagonal sheet', () => {
    // The user's chosen set steers the core outright: two core sheets of four orthogonal views
    // each, then the articulation run over all eight facings.
    const eightWay = withOutput({
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      directions: 'EIGHT_COMPASS',
    });
    expect(sheetRunCount('CHARACTER', eightWay)).toBe(2 + DIRECTION_LISTS.EIGHT_COMPASS.length);

    const { sheets } = sheetBatch('CHARACTER', eightWay);
    expect(sheets[0]?.covered).toEqual(['south', 'west', 'north', 'east']);
    expect(sheets[1]?.covered).toEqual(['south-west', 'north-west', 'north-east', 'south-east']);
    expect(sheets.slice(2).map((sheet) => sheet.covered)).toEqual(
      DIRECTION_LISTS.EIGHT_COMPASS.map((facing) => [facing]),
    );
  });

  it('resolves the mode on both axes, so an unsupported pairing cannot be split by a set it discards', () => {
    // An ITEM has no cut-out rig, so the compiler resolves the pairing to that category's default —
    // its directional views, a multi-view sheet that ignores `primaryDirection` entirely. Counting
    // the facings from the *stored* mode while counting the sheets from the resolved one offered
    // eight runs whose prompts were byte-identical, and one copy ticked all eight off.
    // The resolved sheet is the item's directional views over the chosen eight-compass set — two
    // multi-view sheets and no runs, never eight byte-identical rig prompts.
    expect(sheetRunCount('ITEM', EIGHT_WAY_RIG)).toBe(2);
    expect(sheetRuns('ITEM', SUBJECT, EIGHT_WAY_RIG)).toHaveLength(2);
    expect(sheetBatch('ITEM', EIGHT_WAY_RIG).ordinal).toBe(1);
    // An EFFECT has no directional core: the sheet it resolves to is a frame sequence — a run sheet,
    // so the chosen set genuinely is its run list.
    expect(
      sheetRunCount(
        'EFFECT',
        withOutput({ directionalMode: 'CORE_DIRECTIONAL_VARIANTS', directions: 'EIGHT_COMPASS' }),
      ),
    ).toBe(DIRECTION_LISTS.EIGHT_COMPASS.length);
  });
});

describe('sheetBatch — where the configuration sits in its own batch', () => {
  it('counts a run sheet’s facings in the order the direction set lists them', () => {
    for (const [index, facing] of DIRECTION_LISTS.EIGHT_COMPASS.entries()) {
      const batch = sheetBatch('CHARACTER', { ...EIGHT_WAY_RIG, primaryDirection: facing });
      expect(batch.ordinal, facing).toBe(index + 1);
      expect(batch.sheets).toHaveLength(8);
    }
  });

  it('counts the series axis in plan order, with the run sheet expanded in place', () => {
    expect(sheetBatch('CHARACTER', { ...CORE_SERIES, sheetIndex: 0 }).ordinal).toBe(1);
    // The articulation sheet with nothing pinned is its first run — the sheet after the core.
    expect(sheetBatch('CHARACTER', { ...CORE_SERIES, sheetIndex: 1 }).ordinal).toBe(2);
    // Pinning a facing selects that run of it.
    const [, ...laterFacings] = CORE_FACINGS;
    for (const [index, facing] of laterFacings.entries()) {
      expect(
        sheetBatch('CHARACTER', { ...CORE_SERIES, sheetIndex: 1, primaryDirection: facing }).ordinal,
        facing,
      ).toBe(3 + index);
    }
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
    const eightWayCore = withOutput({
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      directions: 'EIGHT_COMPASS',
    });
    for (const config of [EIGHT_WAY_RIG, CORE_SERIES, eightWayCore, SINGLE_SHEET]) {
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
 * `directions` where it stood, because nothing related a direction set to a category. The panel
 * offered "Split into 3 sheets", and the first run compiled `Directions required: Front-three-quarter`
 * above `object yaw 45°`.
 *
 * The two categories here are the ones whose subject has no facing at all: whatever set the
 * configuration arrived with, `resolveDirectionSet` narrows it to `SINGLE_FRONT` and the batch is
 * one sheet.
 */
describe('a subject with no facing is one sheet, whatever set the configuration arrived with', () => {
  const TURNED = withOutput({ directions: 'THREE_CLASSIC', primaryDirection: 'front-three-quarter' });

  it.each(['INTERFACE', 'TERRAIN'] as const)('%s is not split into a run per facing', (category) => {
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
    expect(sheetRunCount('CHARACTER', rig)).toBe(DIRECTION_LISTS.THREE_CLASSIC.length);
    // And an EFFECT, which is the case that decided the table binds two categories and not three:
    // a directional slash is genuinely one frame sequence per facing.
    expect(sheetRunCount('EFFECT', { ...TURNED, directions: 'EIGHT_COMPASS' })).toBe(
      DIRECTION_LISTS.EIGHT_COMPASS.length,
    );
  });
});
