import { describe, expect, it } from 'vitest';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DIRECTION_LISTS } from '../constants/promptText/index.ts';
import { sheetPlanFor, sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import type { OutputConfig } from '../types/output.ts';
import { DIRECTIONAL_MODES } from '../types/output.ts';
import { DIRECTION_SETS } from '../types/rendering.ts';
import { SUBJECT_CATEGORIES } from '../types/subject.ts';
import {
  directionSetApplies,
  effectiveDirectionSet,
  primaryFacing,
  sheetDirections,
} from './sheetDirections.ts';

/**
 * Which facings one sheet covers, and which it assembles towards.
 *
 * The compiler and the splitter both read this, which is why it is its own function — and why the
 * cases below are about *disagreement*: a resolver that answered differently for the two would put
 * a facing in the prompt that the splitter's own row label denied.
 */
function withOutput(overrides: Partial<OutputConfig>): OutputConfig {
  return { ...DEFAULT_OUTPUT_CONFIG, ...overrides };
}

/** A mode covering one facing at a time: for these the direction set is a run list. */
const RIG = withOutput({ directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION', directions: 'EIGHT_COMPASS' });

/** The one plan a rig has — every sheet of a `'primary'` mode draws its single facing. */
const RIG_PLAN = sheetPlanFor('CHARACTER', 'CUTOUT_RIG_SINGLE_DIRECTION', 0);

/** The two sheets a character's five-view core arrives as: the trunk turned, then the limbs. */
const CORE = sheetPlanFor('CHARACTER', 'CORE_DIRECTIONAL_VARIANTS', 0);
const ARTICULATION = sheetPlanFor('CHARACTER', 'CORE_DIRECTIONAL_VARIANTS', 1);

describe('sheetDirections', () => {
  it('takes the set’s first facing when none is pinned', () => {
    const { covered, assembly } = sheetDirections({ ...RIG, primaryDirection: null }, RIG_PLAN);
    expect(assembly).toBe('south');
    expect(covered).toEqual(['south']);
  });

  it('takes the pinned facing, and covers only that one', () => {
    // This is what makes a split run a *different sheet* rather than a relabelled one.
    const { covered, assembly } = sheetDirections({ ...RIG, primaryDirection: 'north-west' }, RIG_PLAN);
    expect(assembly).toBe('north-west');
    expect(covered).toEqual(['north-west']);
  });

  it('resolves through the set, so a facing it does not contain cannot escape', () => {
    // A stale `north` left behind by a switch to `THREE_CLASSIC`. Trusting it would name an
    // assembly direction and a depth order that the sheet's own "directions required" line omits.
    const { covered, assembly } = sheetDirections(
      { ...RIG, directions: 'THREE_CLASSIC', primaryDirection: 'north' },
      RIG_PLAN,
    );
    expect(assembly).toBe('front-three-quarter');
    expect(covered).toEqual(['front-three-quarter']);
  });

  it('ignores the pinned facing entirely for a mode written against a fixed set', () => {
    // `CORE_DIRECTIONAL_VARIANTS` names its five facings entry by entry, so the sheet is those five
    // whatever the direction controls say.
    const { covered, assembly } = sheetDirections(
      { ...RIG, directionalMode: 'CORE_DIRECTIONAL_VARIANTS', primaryDirection: 'north-west' },
      CORE,
    );
    expect(covered).toEqual([...DIRECTION_LISTS.FIVE_CLASSIC]);
    expect(assembly).toBe('front');
  });

  it('narrows to the assembly facing for a sheet of the series that is not directional', () => {
    // The articulation sheet's thirty-four limb variants are not views of anything, so drawing them
    // once per facing would be a hundred and seventy components. It covers the one facing the rest
    // of the series assembles towards — and takes it from the *series*, not from `primaryDirection`,
    // which belongs to a set this mode never consults.
    const { covered, assembly } = sheetDirections(
      { ...RIG, directionalMode: 'CORE_DIRECTIONAL_VARIANTS', primaryDirection: 'north-west' },
      ARTICULATION,
    );
    expect(covered).toEqual(['front']);
    expect(assembly).toBe('front');
  });

  it('assembles every sheet of a series towards the same facing', () => {
    // What makes the sheets fit together: the limbs are drawn for the trunk view the core sheet
    // leads with, so a series whose members assembled towards different facings would return pieces
    // that cannot be put on one figure.
    for (const category of SUBJECT_CATEGORIES) {
      for (const mode of DIRECTIONAL_MODES) {
        const series = sheetSeriesFor(category, mode);
        const output = withOutput({ directionalMode: mode });
        const assemblies = series.map((plan) => sheetDirections(output, plan).assembly);
        expect(new Set(assemblies).size).toBe(1);
      }
    }
  });

  it('always assembles towards a facing it says it covers', () => {
    // The invariant both readers depend on, over every combination the app can reach.
    for (const category of SUBJECT_CATEGORIES) {
      for (const directionalMode of DIRECTIONAL_MODES) {
        for (const directions of DIRECTION_SETS) {
          for (const primaryDirection of [null, ...DIRECTION_LISTS.EIGHT_COMPASS]) {
            const output = withOutput({ directionalMode, directions, primaryDirection });
            for (const plan of sheetSeriesFor(category, directionalMode)) {
              const { covered, assembly } = sheetDirections(output, plan);
              expect(covered).toContain(assembly);
              expect(covered[0]).toBe(assembly);
            }
          }
        }
      }
    }
  });
});

/**
 * Whether the direction control is worth showing, and what the summary should name.
 *
 * These two exist because the studio had no way to ask. `CORE_DIRECTIONAL_VARIANTS` discards
 * `directions` exactly as it discards `primaryDirection` — but only the facing's control knew, so
 * "Directions Covered" stayed on screen offering four choices the compiler threw away, in the state
 * the app opens in. The assertions below are the two halves of that: a control that should not be
 * there, and a summary line that named the discarded value.
 */
describe('the direction set the sheet is actually drawn to', () => {
  it('defers to the chosen set only for the modes that cover one facing at a time', () => {
    expect(directionSetApplies(withOutput({ directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION' }))).toBe(true);
    expect(directionSetApplies(withOutput({ directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY' }))).toBe(true);
    expect(directionSetApplies(withOutput({ directionalMode: 'TILESET_MODULAR' }))).toBe(true);
    // The one that names its own five, and the default the app boots into.
    expect(directionSetApplies(withOutput({ directionalMode: 'CORE_DIRECTIONAL_VARIANTS' }))).toBe(false);
    expect(directionSetApplies(DEFAULT_OUTPUT_CONFIG)).toBe(false);
  });

  it('reports the mode’s own set where the chosen one is discarded', () => {
    // The digest bug in one line: eight compass points asked for, five classic yaws drawn.
    const output = withOutput({
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      directions: 'EIGHT_COMPASS',
    });
    expect(effectiveDirectionSet(output)).toBe('FIVE_CLASSIC');
  });

  it('reports the chosen set where the mode does defer to it', () => {
    const output = withOutput({
      directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
      directions: 'EIGHT_COMPASS',
    });
    expect(effectiveDirectionSet(output)).toBe('EIGHT_COMPASS');
  });

  it('never names a set the sheet does not draw, for any mode', () => {
    // The property the two functions have to keep together: where the set is reported as applying,
    // the facings actually covered are that set's; where it does not apply, they are not.
    // Every category, not just one: `sheetSeriesFor` resolves a pairing a category does not support
    // back to that category's default, so pinning one category would have checked `TILESET_MODULAR`
    // against a humanoid's plan and never against the tileset it names.
    for (const category of SUBJECT_CATEGORIES) {
      for (const directionalMode of DIRECTIONAL_MODES) {
        const output = withOutput({ directionalMode, directions: 'EIGHT_COMPASS', primaryDirection: null });
        const set = effectiveDirectionSet(output);

        for (const plan of sheetSeriesFor(category, directionalMode)) {
          const { covered } = sheetDirections(output, plan);
          for (const facing of covered) expect(DIRECTION_LISTS[set]).toContain(facing);
        }
        if (!directionSetApplies(output)) expect(set).not.toBe(output.directions);
      }
    }
  });
});

describe('primaryFacing', () => {
  it('is the resolved run-list facing, whatever any sheet plan does with it', () => {
    // Its own function because the studio's facing control and the collapsed projection digest both
    // need this answer and neither has a category to resolve a sheet plan from.
    expect(primaryFacing({ ...RIG, primaryDirection: 'north-west' })).toBe('north-west');
    expect(primaryFacing({ ...RIG, primaryDirection: null })).toBe('south');
    expect(primaryFacing({ ...RIG, directions: 'THREE_CLASSIC', primaryDirection: 'north' })).toBe(
      'front-three-quarter',
    );
  });
});
