import { describe, expect, it } from 'vitest';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DIRECTION_LISTS } from '../constants/promptText/index.ts';
import { resolveDirectionSet } from '../constants/categoryDirectionSets.ts';
import { sheetPlanFor, sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import type { OutputConfig } from '../types/output.ts';
import { DIRECTIONAL_MODES } from '../types/output.ts';
import { DIRECTION_SETS } from '../types/rendering.ts';
import { SUBJECT_CATEGORIES } from '../types/subject.ts';
import { facingApplies, primaryFacing, sheetDirections } from './sheetDirections.ts';

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

/** The one plan a rig has — a `'run'` sheet draws its single facing per generation. */
const RIG_PLAN = sheetPlanFor('CHARACTER', 'CUTOUT_RIG_SINGLE_DIRECTION', 'EIGHT_COMPASS', 0);

/** The two sheets a character's five-view pairing arrives as: the trunk turned, then the limbs. */
const CORE = sheetPlanFor('CHARACTER', 'CORE_DIRECTIONAL_VARIANTS', 'FIVE_CLASSIC', 0);
const ARTICULATION = sheetPlanFor('CHARACTER', 'CORE_DIRECTIONAL_VARIANTS', 'FIVE_CLASSIC', 1);

/**
 * The only sheet an EFFECT has, and the plan a stored `CORE_DIRECTIONAL_VARIANTS` resolves to there.
 *
 * The category that made the resolution's second half reachable: it lacks the directional mode
 * entirely, so a stored pairing degrades to the frame sequence — a run sheet driven by the very
 * direction controls the stored mode would have ignored.
 */
const EFFECT_SEQUENCE = sheetPlanFor('EFFECT', 'CORE_DIRECTIONAL_VARIANTS', 'EIGHT_COMPASS', 0);

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

  it('ignores the pinned facing entirely for a multi-view sheet', () => {
    // A directional core's facings are its plan's own tuple — written from the chosen set — so the
    // primary-facing control changes nothing on it.
    const { covered, assembly } = sheetDirections(
      'CHARACTER',
      withOutput({
        directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
        directions: 'FIVE_CLASSIC',
        primaryDirection: 'back',
      }),
      CORE,
    );
    expect(covered).toEqual([...DIRECTION_LISTS.FIVE_CLASSIC]);
    expect(assembly).toBe('front');
  });

  it('draws the chosen set on the directional core, split for the eight-compass set', () => {
    // The control the core used to discard, honoured: eight compass points asked for arrive as a
    // cardinal sheet and a diagonal sheet whose tuples partition the set in order.
    const output = withOutput({
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      directions: 'EIGHT_COMPASS',
    });
    const [cardinals, diagonals, articulation] = sheetSeriesFor(
      'CHARACTER',
      'CORE_DIRECTIONAL_VARIANTS',
      'EIGHT_COMPASS',
    );
    expect(cardinals.facings).toEqual(['south', 'west', 'north', 'east']);
    expect(diagonals?.facings).toEqual(['south-west', 'north-west', 'north-east', 'south-east']);
    expect(sheetDirections('CHARACTER', output, cardinals).covered).toEqual([
      'south',
      'west',
      'north',
      'east',
    ]);
    // The articulation sheet is a run: with nothing pinned it draws the set's first facing.
    expect(articulation).toBeDefined();
    if (articulation) {
      expect(sheetDirections('CHARACTER', output, articulation).covered).toEqual(['south']);
    }
  });

  it('steers the articulation run by the pinned facing', () => {
    // The limb sheet is one facing per generation, so an eight-direction game asks for it eight
    // times — this is the control that says which run this prompt is.
    const output = withOutput({
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      directions: 'EIGHT_COMPASS',
      sheetIndex: 2,
      primaryDirection: 'north-east',
    });
    const { covered, assembly } = sheetDirections('CHARACTER', output, ARTICULATION);
    expect(covered).toEqual(['north-east']);
    expect(assembly).toBe('north-east');
  });

  it('covers the facings of the mode the category resolves to, not the one stored', () => {
    // The stored pairing is one an EFFECT has no plan for, so the sheet is a frame sequence — a run
    // list, covering the one facing this run is. Read raw, the same configuration claimed a
    // multi-view core: a set the compiled prompt never mentions, on a sheet whose whole component
    // budget goes to time rather than to turning.
    const { covered, assembly } = sheetDirections(
      'EFFECT',
      { ...RIG, directionalMode: 'CORE_DIRECTIONAL_VARIANTS', primaryDirection: 'north-west' },
      EFFECT_SEQUENCE,
    );
    expect(covered).toEqual(['north-west']);
    expect(assembly).toBe('north-west');
  });

  it('assembles every unpinned run towards the facing the first core view leads with', () => {
    // What makes the sheets fit together by default: the set's first facing leads the core's first
    // sheet and is where an unpinned run starts, so the studio's opening prompt for any sheet of a
    // series describes pieces that go on one figure. A pinned facing deliberately moves the runs —
    // that is what generating the other runs *is* — so the invariant is stated of the default.
    for (const category of SUBJECT_CATEGORIES) {
      for (const mode of DIRECTIONAL_MODES) {
        for (const directions of DIRECTION_SETS) {
          const series = sheetSeriesFor(category, mode, directions);
          const output = withOutput({ directionalMode: mode, directions, primaryDirection: null });
          const [firstPlan] = series;
          const lead = sheetDirections(category, output, firstPlan).assembly;
          for (const plan of series) {
            if (plan.facings !== 'run') continue;
            expect(sheetDirections(category, output, plan).assembly).toBe(lead);
          }
        }
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
            for (const plan of sheetSeriesFor(category, directionalMode, directions)) {
              const { covered, assembly } = sheetDirections(category, output, plan);
              expect(covered).toContain(assembly);
              expect(covered[0]).toBe(assembly);
            }
          }
        }
      }
    }
  });

  it('never covers a facing outside the set the category resolves to', () => {
    // The property the digest, the prompt and the split drawer all rely on: whatever arrives, the
    // facings on the sheet are facings of the set actually in force.
    for (const category of SUBJECT_CATEGORIES) {
      for (const directionalMode of DIRECTIONAL_MODES) {
        for (const directions of DIRECTION_SETS) {
          const output = withOutput({ directionalMode, directions, primaryDirection: null });
          const set = resolveDirectionSet(category, directions);
          for (const plan of sheetSeriesFor(category, directionalMode, directions)) {
            const { covered } = sheetDirections(category, output, plan);
            for (const facing of covered) expect(DIRECTION_LISTS[set]).toContain(facing);
          }
        }
      }
    }
  });
});

/**
 * Whether the primary-facing control is worth showing.
 *
 * The predicate exists because the studio had no way to ask: the control gates on the *selected
 * sheet* being a run over a set with more than one facing, and a stored mode or index the category
 * cannot produce must answer for the sheet actually compiled.
 */
describe('facingApplies', () => {
  it('is true exactly where the selected sheet is a run over a plural set', () => {
    expect(facingApplies('CHARACTER', withOutput({ directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION' }))).toBe(
      true,
    );
    expect(facingApplies('CHARACTER', withOutput({ directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY' }))).toBe(
      true,
    );
    expect(facingApplies('BUILDING', withOutput({ directionalMode: 'TILESET_MODULAR' }))).toBe(true);
    // The default configuration selects the character's directional core — a multi-view sheet.
    expect(facingApplies('CHARACTER', DEFAULT_OUTPUT_CONFIG)).toBe(false);
    // Selecting the articulation sheet of the same pairing selects a run.
    expect(facingApplies('CHARACTER', withOutput({ sheetIndex: 1 }))).toBe(true);
  });

  it('is false where the set names a single facing, whatever the sheet', () => {
    expect(
      facingApplies(
        'CHARACTER',
        withOutput({ directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION', directions: 'SINGLE_FRONT' }),
      ),
    ).toBe(false);
    // The category narrows every set to SINGLE_FRONT, so the run list is always one run.
    expect(
      facingApplies(
        'INTERFACE',
        withOutput({ directionalMode: 'TILESET_MODULAR', directions: 'EIGHT_COMPASS' }),
      ),
    ).toBe(false);
  });

  it('answers for the mode the category resolves to, in both directions', () => {
    // An ITEM has no cut-out rig, so the stored rig resolves to its directional views — with the
    // core sheet selected, the facing control has nothing to change.
    expect(facingApplies('ITEM', withOutput({ directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION' }))).toBe(false);
    // An EFFECT has no directional mode, so the stored core resolves to the frame sequence — a run,
    // and the control the studio once hid while the compiler read it.
    expect(facingApplies('EFFECT', withOutput({ directionalMode: 'CORE_DIRECTIONAL_VARIANTS' }))).toBe(true);
  });
});

describe('primaryFacing', () => {
  it('is the resolved run-list facing, whatever any sheet plan does with it', () => {
    // It reads no *mode*, which is why every one of its callers gates on `facingApplies` first. The
    // category it does take is for the *set*: which sets mean anything is a property of the subject.
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
