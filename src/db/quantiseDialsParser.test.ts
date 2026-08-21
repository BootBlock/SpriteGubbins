import { describe, expect, it } from 'vitest';
import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';
import {
  COLOR_MERGE_RANGE,
  INK_THRESHOLD_RANGE,
  KEY_TOLERANCES,
  LINE_STRENGTH_RANGE,
} from '../constants/quantiser.ts';
import type { QuantiseDials } from '../types/quantisePreset.ts';
import { parseQuantiseDials } from './quantiseDialsParser.ts';

/** A stored tuning that differs from the defaults in every field, so a fallback cannot hide. */
const STORED: QuantiseDials = {
  keyingEnabled: true,
  keyTolerance: 64,
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
    // The other twelve survive: a preset with one unreadable dial is still the preset the reader
    // saved in every other respect.
    expect(parsed).toEqual({ ...STORED, inkThreshold: QUANTISE_DEFAULT_DIALS.inkThreshold });
  });

  it('refuses a value outside the range its own control offers', () => {
    for (const outside of [COLOR_MERGE_RANGE.min - 1, COLOR_MERGE_RANGE.max + 1]) {
      expect(parseQuantiseDials({ colorMerge: outside }).colorMerge).toBe(QUANTISE_DEFAULT_DIALS.colorMerge);
    }
    expect(parseQuantiseDials({ colorMerge: COLOR_MERGE_RANGE.max }).colorMerge).toBe(COLOR_MERGE_RANGE.max);
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

  it('takes a boolean as a boolean and nothing else', () => {
    expect(parseQuantiseDials({ keyingEnabled: true }).keyingEnabled).toBe(true);
    expect(parseQuantiseDials({ keyingEnabled: 'true' }).keyingEnabled).toBe(
      QUANTISE_DEFAULT_DIALS.keyingEnabled,
    );
  });
});
