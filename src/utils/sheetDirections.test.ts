import { describe, expect, it } from 'vitest';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DIRECTION_LISTS } from '../constants/promptText/index.ts';
import type { OutputConfig } from '../types/output.ts';
import { sheetDirections } from './sheetDirections.ts';

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
