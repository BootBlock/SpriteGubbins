import { QUANTISE_DEFAULT_TUNING } from '../constants/quantiseTuning.ts';
import {
  CLEANUP_PASSES_RANGE,
  COLOR_MERGE_RANGE,
  FILL_CLEANUP_RANGE,
  INK_THRESHOLD_RANGE,
  KEY_TOLERANCES,
  LINE_STRENGTH_RANGE,
  OUTLINE_EXPANSION_RANGE,
  PALETTE_SNAP_RANGE,
  SPRITE_GAP_RANGE,
  TRIM_STRENGTH_RANGE,
} from '../constants/quantiser.ts';
import type { QuantiseTuning } from '../types/quantisePreset.ts';
import { DITHER_PATTERNS, VOTE_METHODS } from '../types/quantiser.ts';
import { isRecord, pick, pickBoolean, pickNumber, pickWholeNumber } from './readers.ts';

/**
 * Turning a stored set of dial positions back into a {@link QuantiseTuning}.
 *
 * The same contract `db/settingsParser.ts` and `db/configParsers.ts` state, and for the same
 * reason: **this is not a compatibility layer and must not become one.** Nothing here translates a
 * retired value into its replacement — a dither pattern this build no longer has simply falls back
 * to the default. What it is for is storage that has been hand-edited, truncated, or written by a
 * build that spelled a dial differently, all of which stay possible however stable the shape is.
 *
 * **Every check is against the constant that *defines* the dial**, never a list restated here: the
 * two unions against the `as const` arrays in `types/quantiser.ts`, and every number against the
 * `*_RANGE` its slider is built from. So a range widened for the control is widened here by that
 * edit alone, and a stored value the control could not have produced is refused.
 *
 * Falls back **field by field**, never wholesale: one unreadable dial costs that dial, where
 * discarding the object would silently reset the other twelve as well — and a preset whose ink
 * threshold was corrupted is still the preset the reader saved in every other respect.
 *
 * The two dials with a fractional step are read with `pickNumber` rather than
 * `pickWholeNumber`: `lineStrength` and `trimStrength` move in tenths, so 1.5 is an ordinary value
 * for them and a whole-number check would reject the default itself.
 */
export function parseQuantiseTuning(value: unknown): QuantiseTuning {
  if (!isRecord(value)) return QUANTISE_DEFAULT_TUNING;

  return {
    keyingEnabled: pickBoolean(value, 'keyingEnabled', QUANTISE_DEFAULT_TUNING.keyingEnabled),
    // A ladder rather than a range, so membership is the check: the control offers six rungs and a
    // value between two of them is one this app never wrote.
    keyTolerance: pick(value, 'keyTolerance', QUANTISE_DEFAULT_TUNING.keyTolerance, KEY_TOLERANCES),
    vote: pick(value, 'vote', QUANTISE_DEFAULT_TUNING.vote, VOTE_METHODS),
    outlineExpansion: pickWholeNumber(
      value,
      'outlineExpansion',
      QUANTISE_DEFAULT_TUNING.outlineExpansion,
      OUTLINE_EXPANSION_RANGE,
    ),
    lineStrength: pickNumber(
      value,
      'lineStrength',
      QUANTISE_DEFAULT_TUNING.lineStrength,
      LINE_STRENGTH_RANGE,
    ),
    trimStrength: pickNumber(
      value,
      'trimStrength',
      QUANTISE_DEFAULT_TUNING.trimStrength,
      TRIM_STRENGTH_RANGE,
    ),
    inkThreshold: pickWholeNumber(
      value,
      'inkThreshold',
      QUANTISE_DEFAULT_TUNING.inkThreshold,
      INK_THRESHOLD_RANGE,
    ),
    fillCleanup: pickWholeNumber(
      value,
      'fillCleanup',
      QUANTISE_DEFAULT_TUNING.fillCleanup,
      FILL_CLEANUP_RANGE,
    ),
    colorMerge: pickWholeNumber(value, 'colorMerge', QUANTISE_DEFAULT_TUNING.colorMerge, COLOR_MERGE_RANGE),
    cleanupPasses: pickWholeNumber(
      value,
      'cleanupPasses',
      QUANTISE_DEFAULT_TUNING.cleanupPasses,
      CLEANUP_PASSES_RANGE,
    ),
    dither: pick(value, 'dither', QUANTISE_DEFAULT_TUNING.dither, DITHER_PATTERNS),
    paletteSnap: pickWholeNumber(
      value,
      'paletteSnap',
      QUANTISE_DEFAULT_TUNING.paletteSnap,
      PALETTE_SNAP_RANGE,
    ),
    spriteGap: pickWholeNumber(value, 'spriteGap', QUANTISE_DEFAULT_TUNING.spriteGap, SPRITE_GAP_RANGE),
  };
}
