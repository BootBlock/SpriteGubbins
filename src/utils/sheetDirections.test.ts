import { describe, expect, it } from 'vitest';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DIRECTION_LISTS } from '../constants/promptText/index.ts';
import type { OutputConfig } from '../types/output.ts';
import { DIRECTIONAL_MODES } from '../types/output.ts';
import { directionSetApplies, effectiveDirectionSet, sheetDirections } from './sheetDirections.ts';

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

describe('sheetDirections', () => {
  it('takes the set’s first facing when none is pinned', () => {
    const { covered, assembly } = sheetDirections({ ...RIG, primaryDirection: null });
    expect(assembly).toBe('south');
    expect(covered).toEqual(['south']);
  });

  it('takes the pinned facing, and covers only that one', () => {
    // This is what makes a split run a *different sheet* rather than a relabelled one.
    const { covered, assembly } = sheetDirections({ ...RIG, primaryDirection: 'north-west' });
    expect(assembly).toBe('north-west');
    expect(covered).toEqual(['north-west']);
  });

  it('resolves through the set, so a facing it does not contain cannot escape', () => {
    // A stale `north` left behind by a switch to `THREE_CLASSIC`. Trusting it would name an
    // assembly direction and a depth order that the sheet's own "directions required" line omits.
    const { covered, assembly } = sheetDirections({
      ...RIG,
      directions: 'THREE_CLASSIC',
      primaryDirection: 'north',
    });
    expect(assembly).toBe('front-three-quarter');
    expect(covered).toEqual(['front-three-quarter']);
  });

  it('ignores the pinned facing entirely for a mode written against a fixed set', () => {
    // `CORE_DIRECTIONAL_VARIANTS` names its three facings entry by entry in a 43-component
    // inventory, so the sheet is those three whatever the direction controls say.
    const { covered, assembly } = sheetDirections({
      ...RIG,
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      primaryDirection: 'north-west',
    });
    expect(covered).toEqual([...DIRECTION_LISTS.THREE_CLASSIC]);
    expect(assembly).toBe('front-three-quarter');
  });

  it('always assembles towards a facing it says it covers', () => {
    // The invariant both readers depend on, over every combination the app can reach.
    for (const directionalMode of ['CUTOUT_RIG_SINGLE_DIRECTION', 'CORE_DIRECTIONAL_VARIANTS'] as const) {
      for (const directions of ['SINGLE_FRONT', 'THREE_CLASSIC', 'FOUR_CARDINAL', 'EIGHT_COMPASS'] as const) {
        for (const primaryDirection of [null, ...DIRECTION_LISTS.EIGHT_COMPASS]) {
          const { covered, assembly } = sheetDirections(
            withOutput({ directionalMode, directions, primaryDirection }),
          );
          expect(covered).toContain(assembly);
          expect(covered[0]).toBe(assembly);
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
    // The one that names its own three, and the default the app boots into.
    expect(directionSetApplies(withOutput({ directionalMode: 'CORE_DIRECTIONAL_VARIANTS' }))).toBe(false);
    expect(directionSetApplies(DEFAULT_OUTPUT_CONFIG)).toBe(false);
  });

  it('reports the mode’s own set where the chosen one is discarded', () => {
    // The digest bug in one line: eight compass points asked for, three classic yaws drawn.
    const output = withOutput({
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      directions: 'EIGHT_COMPASS',
    });
    expect(effectiveDirectionSet(output)).toBe('THREE_CLASSIC');
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
    for (const directionalMode of DIRECTIONAL_MODES) {
      const output = withOutput({ directionalMode, directions: 'EIGHT_COMPASS', primaryDirection: null });
      const set = effectiveDirectionSet(output);
      const { covered } = sheetDirections(output);

      for (const facing of covered) expect(DIRECTION_LISTS[set]).toContain(facing);
      if (!directionSetApplies(output)) expect(set).not.toBe(output.directions);
    }
  });
});
