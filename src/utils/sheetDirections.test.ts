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

/**
 * The only sheet an EFFECT has, and the plan a stored `CORE_DIRECTIONAL_VARIANTS` resolves to there.
 *
 * The category that made the second half of the divergence reachable: the first to *lack* the one
 * mode whose coverage is a fixed set, so the first on which a resolution can turn a fixed set into a
 * run list rather than the other way about. TERRAIN is now a second, and the whole-category loops
 * below cover it — this stays on EFFECT because it is the case the defect was found against.
 */
const EFFECT_SEQUENCE = sheetPlanFor('EFFECT', 'CORE_DIRECTIONAL_VARIANTS', 0);

describe('sheetDirections', () => {
  it('takes the set’s first facing when none is pinned', () => {
    const { covered, assembly } = sheetDirections('CHARACTER', { ...RIG, primaryDirection: null }, RIG_PLAN);
    expect(assembly).toBe('south');
    expect(covered).toEqual(['south']);
  });

  it('takes the pinned facing, and covers only that one', () => {
    // This is what makes a split run a *different sheet* rather than a relabelled one.
    const { covered, assembly } = sheetDirections(
      'CHARACTER',
      { ...RIG, primaryDirection: 'north-west' },
      RIG_PLAN,
    );
    expect(assembly).toBe('north-west');
    expect(covered).toEqual(['north-west']);
  });

  it('resolves through the set, so a facing it does not contain cannot escape', () => {
    // A stale `north` left behind by a switch to `THREE_CLASSIC`. Trusting it would name an
    // assembly direction and a depth order that the sheet's own "directions required" line omits.
    const { covered, assembly } = sheetDirections(
      'CHARACTER',
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
      'CHARACTER',
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
      'CHARACTER',
      { ...RIG, directionalMode: 'CORE_DIRECTIONAL_VARIANTS', primaryDirection: 'north-west' },
      ARTICULATION,
    );
    expect(covered).toEqual(['front']);
    expect(assembly).toBe('front');
  });

  it('covers the facings of the mode the category resolves to, not the one stored', () => {
    // The stored pairing is one an EFFECT has no plan for, so the sheet is a frame sequence — a run
    // list, covering the one facing this run is. Read raw, the same configuration claimed the five
    // classic yaws: a set the compiled prompt never mentions, on a sheet whose whole component
    // budget goes to time rather than to turning.
    const { covered, assembly } = sheetDirections(
      'EFFECT',
      { ...RIG, directionalMode: 'CORE_DIRECTIONAL_VARIANTS', primaryDirection: 'north-west' },
      EFFECT_SEQUENCE,
    );
    expect(covered).toEqual(['north-west']);
    expect(assembly).toBe('north-west');
  });

  it('assembles every sheet of a series towards the same facing', () => {
    // What makes the sheets fit together: the limbs are drawn for the trunk view the core sheet
    // leads with, so a series whose members assembled towards different facings would return pieces
    // that cannot be put on one figure.
    for (const category of SUBJECT_CATEGORIES) {
      for (const mode of DIRECTIONAL_MODES) {
        const series = sheetSeriesFor(category, mode);
        const output = withOutput({ directionalMode: mode });
        const assemblies = series.map((plan) => sheetDirections(category, output, plan).assembly);
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
              const { covered, assembly } = sheetDirections(category, output, plan);
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
    // Each mode asked of a category that actually has it — `TILESET_MODULAR` on a CHARACTER is not a
    // tileset, it is a humanoid's five views, which is the whole point of the resolution below.
    expect(
      directionSetApplies('CHARACTER', withOutput({ directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION' })),
    ).toBe(true);
    expect(
      directionSetApplies('CHARACTER', withOutput({ directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY' })),
    ).toBe(true);
    expect(directionSetApplies('BUILDING', withOutput({ directionalMode: 'TILESET_MODULAR' }))).toBe(true);
    // The one that names its own five, and the default the app boots into.
    expect(
      directionSetApplies('CHARACTER', withOutput({ directionalMode: 'CORE_DIRECTIONAL_VARIANTS' })),
    ).toBe(false);
    expect(directionSetApplies('CHARACTER', DEFAULT_OUTPUT_CONFIG)).toBe(false);
  });

  it('answers for the mode the category resolves to, in both directions', () => {
    // The studio/compiler divergence, as the one question both sides now ask. A configuration
    // carrying a pairing its category has no plan for reaches the app through an imported preset or
    // a hand-edited session, and `resolveMode` repairs it for the compiler; read raw here, the two
    // controls this predicate gates disagreed with the prompt about the same configuration.

    // Shown, and discarded: an ITEM has no cut-out rig, so the sheet is its five directional views
    // and both direction controls were on screen with nothing to change.
    expect(directionSetApplies('ITEM', withOutput({ directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION' }))).toBe(
      false,
    );

    // Hidden, and honoured — the worse way round, and the one an EFFECT made reachable. The sheet is
    // a frame sequence, so the prompt's directions, its rotation, its primary facing and its depth
    // order all come from the two fields the studio had decided were inert.
    expect(directionSetApplies('EFFECT', withOutput({ directionalMode: 'CORE_DIRECTIONAL_VARIANTS' }))).toBe(
      true,
    );
  });

  it('reports the mode’s own set where the chosen one is discarded', () => {
    // The digest bug in one line: eight compass points asked for, five classic yaws drawn.
    const output = withOutput({
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      directions: 'EIGHT_COMPASS',
    });
    expect(effectiveDirectionSet('CHARACTER', output)).toBe('FIVE_CLASSIC');
    // And the same configuration on the category that cannot draw it: the frame sequence defers to
    // the chosen set, so `FIVE_CLASSIC` here would be naming a set no sheet in the batch covers.
    expect(effectiveDirectionSet('EFFECT', output)).toBe('EIGHT_COMPASS');
  });

  it('reports the chosen set where the mode does defer to it', () => {
    const output = withOutput({
      directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
      directions: 'EIGHT_COMPASS',
    });
    expect(effectiveDirectionSet('CHARACTER', output)).toBe('EIGHT_COMPASS');
    // An ITEM resolves that rig to its own five views, which name their own facings.
    expect(effectiveDirectionSet('ITEM', output)).toBe('FIVE_CLASSIC');
  });

  it('never names a set the sheet does not draw, for any mode', () => {
    // The property the two functions have to keep together: where the set is reported as applying,
    // the facings actually covered are that set's; where it does not apply, they are not.
    // Every category, not just one: `sheetSeriesFor` resolves a pairing a category does not support
    // back to that category's default, so pinning one category would have checked `TILESET_MODULAR`
    // against a humanoid's plan and never against the tileset it names. The category now reaches the
    // two predicates as well as the plans, so every pairing here is asked of one resolved sheet
    // rather than of a plan and a coverage that could describe different ones.
    for (const category of SUBJECT_CATEGORIES) {
      for (const directionalMode of DIRECTIONAL_MODES) {
        const output = withOutput({ directionalMode, directions: 'EIGHT_COMPASS', primaryDirection: null });
        const set = effectiveDirectionSet(category, output);

        for (const plan of sheetSeriesFor(category, directionalMode)) {
          const { covered } = sheetDirections(category, output, plan);
          for (const facing of covered) expect(DIRECTION_LISTS[set]).toContain(facing);
        }
        if (!directionSetApplies(category, output)) expect(set).not.toBe(output.directions);
      }
    }
  });
});

describe('primaryFacing', () => {
  it('is the resolved run-list facing, whatever any sheet plan does with it', () => {
    // It reads no *mode*, which is why every one of its callers gates on `directionSetApplies`
    // first — directly, or through the `splitsIntoFacingRuns` that delegates to it. The category it
    // does take is for the *set*: which sets mean anything is a property of the subject.
    expect(primaryFacing('CHARACTER', { ...RIG, primaryDirection: 'north-west' })).toBe('north-west');
    expect(primaryFacing('CHARACTER', { ...RIG, primaryDirection: null })).toBe('south');
    expect(
      primaryFacing('CHARACTER', { ...RIG, directions: 'THREE_CLASSIC', primaryDirection: 'north' }),
    ).toBe('front-three-quarter');
  });

  it('resolves the set through the category before resolving the facing through the set', () => {
    // The two resolutions compose, and the order matters: an INTERFACE draws `SINGLE_FRONT`, so a
    // `front-three-quarter` that is perfectly valid against the stored `THREE_CLASSIC` is still a
    // facing this sheet never turns to. Resolving only the facing would have accepted it.
    const turned = { ...RIG, directions: 'THREE_CLASSIC', primaryDirection: 'front-three-quarter' } as const;
    expect(primaryFacing('INTERFACE', turned)).toBe('front');
    expect(primaryFacing('CHARACTER', turned)).toBe('front-three-quarter');
  });
});
