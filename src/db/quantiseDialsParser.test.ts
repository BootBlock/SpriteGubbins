import { describe, expect, it } from 'vitest';
import * as AUTO_TUNE from '../constants/autoTune.ts';
import { QUANTISE_DEFAULT_DIALS, QUANTISE_DIAL_KEYS } from '../constants/quantiseDials.ts';
import {
  ANTI_ALIAS_RUN_RANGE,
  ANTI_ALIAS_STRENGTH_RANGE,
  ANTI_ALIAS_THRESHOLD_RANGE,
  CLEANUP_PASSES_RANGE,
  COLOR_MERGE_RANGE,
  DUPLICATE_TOLERANCE_RANGE,
  FILL_CLEANUP_RANGE,
  FRAME_DRIFT_RANGE,
  INK_THRESHOLD_RANGE,
  KEY_TOLERANCES,
  LINE_STRENGTH_RANGE,
  OUTLINE_EXPANSION_RANGE,
  PALETTE_SNAP_RANGE,
  SPRITE_GAP_RANGE,
  SYMMETRY_CONFIDENCE_RANGE,
  SYMMETRY_TOLERANCE_RANGE,
  TRIM_STRENGTH_RANGE,
} from '../constants/quantiser.ts';
import type { QuantiseDials } from '../types/quantisePreset.ts';
import { isOnStep } from '../utils/isOnStep.ts';
import { parseQuantiseDials } from './quantiseDialsParser.ts';

/** A range as the parser reads it: three numbers, all three checked. */
interface DialRange {
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

/**
 * Every dial the parser reads as a position on a range, against the range that defines it.
 *
 * Written out so the sweep below can put an off-grid value on each in turn, and guarded for
 * completeness by the assertion beside it: a dial added to {@link QUANTISE_DEFAULT_DIALS} as a
 * number is either a ladder or belongs here, and until it is named the sweep would silently stop
 * covering it.
 */
const RANGED_DIALS: Readonly<Record<string, DialRange>> = {
  outlineExpansion: OUTLINE_EXPANSION_RANGE,
  lineStrength: LINE_STRENGTH_RANGE,
  trimStrength: TRIM_STRENGTH_RANGE,
  inkThreshold: INK_THRESHOLD_RANGE,
  fillCleanup: FILL_CLEANUP_RANGE,
  colorMerge: COLOR_MERGE_RANGE,
  cleanupPasses: CLEANUP_PASSES_RANGE,
  paletteSnap: PALETTE_SNAP_RANGE,
  spriteGap: SPRITE_GAP_RANGE,
  symmetryTolerance: SYMMETRY_TOLERANCE_RANGE,
  symmetryConfidence: SYMMETRY_CONFIDENCE_RANGE,
  duplicateTolerance: DUPLICATE_TOLERANCE_RANGE,
  frameDriftTolerance: FRAME_DRIFT_RANGE,
  antiAliasThreshold: ANTI_ALIAS_THRESHOLD_RANGE,
  antiAliasStrength: ANTI_ALIAS_STRENGTH_RANGE,
  antiAliasRun: ANTI_ALIAS_RUN_RANGE,
};

/** The two numeric dials that are a ladder of named rungs rather than a range. */
const LADDER_DIALS = ['keyTolerance', 'silhouetteThreshold'];

/**
 * Which dial each of the sweep's candidate ladders is a ladder of.
 *
 * The sweep writes its own positions straight onto the dials, so a candidate the parser refuses is
 * a position the reader watches reset the next time the tab loads. The ladders themselves come from
 * `constants/autoTune.ts`; only the pairing is written here, and the assertion below fails if a
 * ladder is added there without one.
 */
const TUNE_LADDER_DIALS: Readonly<Record<string, string>> = {
  TUNE_OUTLINE_EXPANSIONS: 'outlineExpansion',
  TUNE_LINE_STRENGTHS: 'lineStrength',
  TUNE_TRIM_STRENGTHS: 'trimStrength',
  TUNE_INK_THRESHOLDS: 'inkThreshold',
  TUNE_COLOR_MERGES: 'colorMerge',
  TUNE_FILL_CLEANUPS: 'fillCleanup',
  TUNE_CLEANUP_PASSES: 'cleanupPasses',
  TUNE_ALIAS_THRESHOLDS: 'antiAliasThreshold',
  TUNE_ALIAS_RUNS: 'antiAliasRun',
  TUNE_ALIAS_STRENGTHS: 'antiAliasStrength',
};

/** Every ladder of numbers the sweep can settle a dial on, found rather than listed. */
function tuneLadders(): readonly (readonly [string, readonly number[]])[] {
  return Object.entries(AUTO_TUNE).flatMap(([name, value]) =>
    Array.isArray(value) && value.every((entry) => typeof entry === 'number')
      ? [[name, value as readonly number[]] as const]
      : [],
  );
}

/** A stored tuning that differs from the defaults in every field, so a fallback cannot hide. */
const STORED: QuantiseDials = {
  keyingEnabled: true,
  keyTolerance: 64,
  silhouetteThreshold: 0,
  vote: 'INK_WEIGHTED',
  outlineExpansion: 2,
  lineStrength: 2.3,
  trimStrength: 1.1,
  inkThreshold: 80,
  fillCleanup: 12,
  colorMerge: 24,
  cleanupPasses: 3,
  dither: 'BAYER_8',
  paletteSnap: 40,
  spriteGap: 4,
  symmetry: 'SNAP',
  symmetryTolerance: 20,
  symmetryConfidence: 75,
  duplicateTolerance: 5,
  duplicateSnap: true,
  frameAlignment: 'OFF',
  frameDriftTolerance: 0,
  antiAlias: 'OFF' as const,
  antiAliasThreshold: 24,
  antiAliasStrength: 100,
  antiAliasRun: 2,
  antiAliasPalette: 'SNAP' as const,
};

describe('parseQuantiseDials', () => {
  it('reads back every dial a preset stored', () => {
    expect(parseQuantiseDials(STORED)).toEqual(STORED);
  });

  it('answers the defaults for anything that is not a record at all', () => {
    for (const value of [undefined, null, 'settings', 7, []]) {
      expect(parseQuantiseDials(value)).toEqual(QUANTISE_DEFAULT_DIALS);
    }
  });

  it('falls back field by field, keeping the dials that did read', () => {
    const parsed = parseQuantiseDials({ ...STORED, inkThreshold: 'quite dark' });

    expect(parsed.inkThreshold).toBe(QUANTISE_DEFAULT_DIALS.inkThreshold);
    // The other nineteen survive: a preset with one unreadable dial is still the preset the reader
    // saved in every other respect.
    expect(parsed).toEqual({ ...STORED, inkThreshold: QUANTISE_DEFAULT_DIALS.inkThreshold });
  });

  it('refuses a value outside the range its own control offers', () => {
    for (const outside of [COLOR_MERGE_RANGE.min - 1, COLOR_MERGE_RANGE.max + 1]) {
      expect(parseQuantiseDials({ colorMerge: outside }).colorMerge).toBe(QUANTISE_DEFAULT_DIALS.colorMerge);
    }
    expect(parseQuantiseDials({ colorMerge: COLOR_MERGE_RANGE.max }).colorMerge).toBe(COLOR_MERGE_RANGE.max);
  });

  it('refuses a symmetry mode this build does not have', () => {
    // No translation into a replacement, which is what this layer is not: a mode that has been
    // retired simply falls back to the default, and the default is the pass switched off.
    expect(parseQuantiseDials({ ...STORED, symmetry: 'MIRROR' }).symmetry).toBe(
      QUANTISE_DEFAULT_DIALS.symmetry,
    );
  });

  it('refuses a confidence floor below the one its own control offers', () => {
    // The floor under the floor: a stored 10% would be a position the slider has no notch for, and
    // one that offers to settle a sprite whose halves agree a tenth of the time.
    expect(
      parseQuantiseDials({ symmetryConfidence: SYMMETRY_CONFIDENCE_RANGE.min - 1 }).symmetryConfidence,
    ).toBe(QUANTISE_DEFAULT_DIALS.symmetryConfidence);
    expect(parseQuantiseDials({ symmetryConfidence: SYMMETRY_CONFIDENCE_RANGE.min }).symmetryConfidence).toBe(
      SYMMETRY_CONFIDENCE_RANGE.min,
    );
  });

  it('refuses a fractional value for a dial that counts in whole steps', () => {
    // Rejected rather than rounded: rounding is a translation, which this layer does not do.
    expect(parseQuantiseDials({ inkThreshold: INK_THRESHOLD_RANGE.min + 0.5 }).inkThreshold).toBe(
      QUANTISE_DEFAULT_DIALS.inkThreshold,
    );
  });

  it('keeps a fractional value for the two dials that move in tenths', () => {
    expect(parseQuantiseDials({ lineStrength: 2.7 }).lineStrength).toBe(2.7);
    expect(parseQuantiseDials({ trimStrength: 0.4 }).trimStrength).toBe(0.4);
    expect(parseQuantiseDials({ lineStrength: LINE_STRENGTH_RANGE.max + 0.1 }).lineStrength).toBe(
      QUANTISE_DEFAULT_DIALS.lineStrength,
    );
  });

  it('reads the key tolerance as a rung, not as a range', () => {
    // Between two rungs is a value this app never wrote, and admitting it would hand the control a
    // position it has no way to show.
    const between = (KEY_TOLERANCES[3] + KEY_TOLERANCES[4]) / 2;
    expect(KEY_TOLERANCES).not.toContain(between);
    expect(parseQuantiseDials({ keyTolerance: between }).keyTolerance).toBe(
      QUANTISE_DEFAULT_DIALS.keyTolerance,
    );
    for (const rung of KEY_TOLERANCES) {
      expect(parseQuantiseDials({ keyTolerance: rung }).keyTolerance).toBe(rung);
    }
  });

  it('falls back for a union value this build no longer has', () => {
    // Not translated into a replacement: the parser is not a compatibility layer, and a retired
    // identifier simply falls to the default.
    expect(parseQuantiseDials({ vote: 'MEDIAN' }).vote).toBe(QUANTISE_DEFAULT_DIALS.vote);
    expect(parseQuantiseDials({ dither: 'FLOYD_STEINBERG' }).dither).toBe(QUANTISE_DEFAULT_DIALS.dither);
  });

  it('names every dial that is read as a position on a range', () => {
    // The sweep below is only as complete as this table, and a dial added to the parser with a new
    // range would otherwise go uncovered without failing anything.
    const numeric = QUANTISE_DIAL_KEYS.filter((key) => typeof QUANTISE_DEFAULT_DIALS[key] === 'number');

    expect([...Object.keys(RANGED_DIALS), ...LADDER_DIALS].sort()).toEqual([...numeric].sort());
  });

  it('refuses a position off the grid its own control moves on, dial by dial', () => {
    // The defect this replaced: bounds were checked and the step beside them was not, so an
    // imported pack could name a line strength of 2.34567 that the panel then reported as `2.3×`
    // and no drag of the slider could return to.
    for (const [key, range] of Object.entries(RANGED_DIALS)) {
      const fallback = QUANTISE_DEFAULT_DIALS[key as keyof QuantiseDials];
      const offGrid = range.min + range.step / 2;
      // Not `min + step`, which is the sprite gap's own default: a refusal returns the default, so
      // an on-grid position that *is* the default cannot tell acceptance from rejection.
      const onGrid =
        range.min + range.step === fallback ? range.min + 2 * range.step : range.min + range.step;

      // Both probes have to differ from what a refusal hands back, or the assertions below pass
      // whatever the parser did — which is how this sweep would go quiet without failing.
      expect({ key, offGridIsDefault: offGrid === fallback, onGridIsDefault: onGrid === fallback }).toEqual({
        key,
        offGridIsDefault: false,
        onGridIsDefault: false,
      });
      expect(onGrid).toBeLessThanOrEqual(range.max);

      expect({ [key]: parseQuantiseDials({ [key]: offGrid })[key as keyof QuantiseDials] }).toEqual({
        [key]: fallback,
      });
      expect({ [key]: parseQuantiseDials({ [key]: onGrid })[key as keyof QuantiseDials] }).toEqual({
        [key]: onGrid,
      });
    }
  });

  it('refuses the three figures an imported pack was reported carrying', () => {
    // Read straight from the issue: two dials that move in tenths, and one whose grid is offset —
    // it opens at 10 and moves in fives, so 37 is a position no drag reaches and 35 is one that is.
    expect(parseQuantiseDials({ lineStrength: 2.34567 }).lineStrength).toBe(
      QUANTISE_DEFAULT_DIALS.lineStrength,
    );
    expect(parseQuantiseDials({ trimStrength: 0.71828 }).trimStrength).toBe(
      QUANTISE_DEFAULT_DIALS.trimStrength,
    );
    expect(parseQuantiseDials({ antiAliasStrength: 37 }).antiAliasStrength).toBe(
      QUANTISE_DEFAULT_DIALS.antiAliasStrength,
    );
    expect(parseQuantiseDials({ antiAliasStrength: 35 }).antiAliasStrength).toBe(35);
  });

  it('opens every dial on its own control’s grid', () => {
    // Asserted against `isOnStep` rather than through the parser, because through the parser it
    // cannot fail: every field falls back to the default it is being handed, so acceptance and
    // rejection return the same number. A default off its grid is a real failure and a silent one —
    // it would be admitted out of storage by the fallback and refused when it arrives as a value, so
    // a preset naming it would read back at the default while the panel showed its neighbour.
    for (const [key, range] of Object.entries(RANGED_DIALS)) {
      const opening = QUANTISE_DEFAULT_DIALS[key as keyof QuantiseDials] as number;

      expect({ key, onGrid: isOnStep(opening, range.min, range.step) }).toEqual({ key, onGrid: true });
      expect(opening).toBeGreaterThanOrEqual(range.min);
      expect(opening).toBeLessThanOrEqual(range.max);
    }
  });

  it('keeps every position the auto-tune sweep can settle on', () => {
    const ladders = tuneLadders();
    expect(Object.keys(TUNE_LADDER_DIALS).sort()).toEqual(ladders.map(([name]) => name).sort());

    for (const [name, values] of ladders) {
      const key = TUNE_LADDER_DIALS[name];
      if (key === undefined) throw new Error(`${name} has no dial.`);
      const range = RANGED_DIALS[key];
      if (range === undefined) throw new Error(`${key} is not read as a position on a range.`);

      for (const value of values) {
        // The grid claim directly, because a rung that happens to *be* the dial's default reads back
        // as itself whether the parser accepted it or refused it.
        expect({ key, value, onGrid: isOnStep(value, range.min, range.step) }).toEqual({
          key,
          value,
          onGrid: true,
        });
        expect({ [key]: parseQuantiseDials({ [key]: value })[key as keyof QuantiseDials] }).toEqual({
          [key]: value,
        });
      }
    }
  });

  it('takes a boolean as a boolean and nothing else', () => {
    expect(parseQuantiseDials({ keyingEnabled: true }).keyingEnabled).toBe(true);
    expect(parseQuantiseDials({ keyingEnabled: 'true' }).keyingEnabled).toBe(
      QUANTISE_DEFAULT_DIALS.keyingEnabled,
    );
  });
});
