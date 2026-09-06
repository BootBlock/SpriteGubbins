import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';
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
  SILHOUETTE_THRESHOLDS,
  SPRITE_GAP_RANGE,
  SYMMETRY_CONFIDENCE_RANGE,
  SYMMETRY_TOLERANCE_RANGE,
  TRIM_STRENGTH_RANGE,
} from '../constants/quantiser.ts';
import type { QuantiseDials } from '../types/quantisePreset.ts';
import {
  ANTI_ALIAS_MODES,
  ANTI_ALIAS_PALETTES,
  DITHER_PATTERNS,
  FRAME_ALIGNMENT_MODES,
  SYMMETRY_MODES,
  VOTE_METHODS,
} from '../types/quantiser.ts';
import { isRecord, pick, pickBoolean, pickSteppedNumber } from './readers.ts';

/**
 * Turning a stored set of dial positions back into a {@link QuantiseDials}.
 *
 * The same contract `db/settingsParser.ts` and `db/configParsers.ts` state, and for the same
 * reason: **this is not a compatibility layer and must not become one.** Nothing here translates a
 * retired value into its replacement — a dither pattern this build no longer has simply falls back
 * to the default. What it is for is storage that has been hand-edited, truncated, or written by a
 * build that spelled a dial differently, all of which stay possible however stable the shape is.
 *
 * **Which unions get validated is decided by one thing, and this is where that rule lives.** A
 * string-literal union in `types/quantiser.ts` is checked on the way out of storage exactly when it
 * is a field of {@link QuantiseDials} — which, since `QuantiseDials extends QuantiseTuning`, means
 * every dial the pipeline takes plus the three the tab adds. That is what a saved preset carries, so
 * that is what a stored blob can misspell. A control union that is not such a field has nothing here
 * to validate; `PREVIEW_MODES` is the one, and it says so. The rule is stated here rather than
 * verdict-by-verdict beside each array, because per-union verdicts are what drifted: two of them
 * claimed their dial was never persisted for months after this parser began checking it, and the
 * docblocks around them were written against those two (issue #258).
 * `tests/quantise-dials-validation.test.ts` asserts the rule rather than the list, so the seventh
 * dial given a union is covered by the edit that gives it one.
 *
 * **Every check is against the constant that *defines* the dial**, never a list restated here: each
 * union against its own `as const` array in `types/quantiser.ts`, each ladder against the array of
 * rungs the control offers, and every number against the `*_RANGE` its slider is built from. So a
 * range widened for the control is widened here by that edit alone, and a stored value the control
 * could not have produced is refused.
 *
 * Falls back **field by field**, never wholesale: one unreadable dial costs that dial, where
 * discarding the object would silently reset every other dial on the tab as well — and a preset
 * whose ink threshold was corrupted is still the preset the reader saved in every other respect.
 *
 * **A range is three numbers, and all three are checked.** Every ranged dial is read with
 * `pickSteppedNumber`, which asks the `*_RANGE`'s own `step` where the position sits as well as the
 * bounds — so `lineStrength` and `trimStrength` moving in tenths, `antiAliasStrength` in fives from
 * 10, and every other one counting in ones are one check rather than three kinds of read. Bounds
 * alone had admitted an imported pack's `lineStrength` of 2.34567, which the panel then reported as
 * `2.3×` and no drag of the slider could return to. Reading the ones that count in ones the same way
 * is the half that keeps working: the next dial given a step of 2 is checked by the edit that gives
 * it one.
 */
export function parseQuantiseDials(value: unknown): QuantiseDials {
  if (!isRecord(value)) return QUANTISE_DEFAULT_DIALS;

  return {
    keyingEnabled: pickBoolean(value, 'keyingEnabled', QUANTISE_DEFAULT_DIALS.keyingEnabled),
    // A ladder rather than a range, so membership is the check: the control offers six rungs and a
    // value between two of them is one this app never wrote.
    keyTolerance: pick(value, 'keyTolerance', QUANTISE_DEFAULT_DIALS.keyTolerance, KEY_TOLERANCES),
    // A ladder too, and checked the same way and for the same reason.
    silhouetteThreshold: pick(
      value,
      'silhouetteThreshold',
      QUANTISE_DEFAULT_DIALS.silhouetteThreshold,
      SILHOUETTE_THRESHOLDS,
    ),
    vote: pick(value, 'vote', QUANTISE_DEFAULT_DIALS.vote, VOTE_METHODS),
    outlineExpansion: pickSteppedNumber(
      value,
      'outlineExpansion',
      QUANTISE_DEFAULT_DIALS.outlineExpansion,
      OUTLINE_EXPANSION_RANGE,
    ),
    lineStrength: pickSteppedNumber(
      value,
      'lineStrength',
      QUANTISE_DEFAULT_DIALS.lineStrength,
      LINE_STRENGTH_RANGE,
    ),
    trimStrength: pickSteppedNumber(
      value,
      'trimStrength',
      QUANTISE_DEFAULT_DIALS.trimStrength,
      TRIM_STRENGTH_RANGE,
    ),
    inkThreshold: pickSteppedNumber(
      value,
      'inkThreshold',
      QUANTISE_DEFAULT_DIALS.inkThreshold,
      INK_THRESHOLD_RANGE,
    ),
    fillCleanup: pickSteppedNumber(
      value,
      'fillCleanup',
      QUANTISE_DEFAULT_DIALS.fillCleanup,
      FILL_CLEANUP_RANGE,
    ),
    colorMerge: pickSteppedNumber(value, 'colorMerge', QUANTISE_DEFAULT_DIALS.colorMerge, COLOR_MERGE_RANGE),
    cleanupPasses: pickSteppedNumber(
      value,
      'cleanupPasses',
      QUANTISE_DEFAULT_DIALS.cleanupPasses,
      CLEANUP_PASSES_RANGE,
    ),
    dither: pick(value, 'dither', QUANTISE_DEFAULT_DIALS.dither, DITHER_PATTERNS),
    paletteSnap: pickSteppedNumber(
      value,
      'paletteSnap',
      QUANTISE_DEFAULT_DIALS.paletteSnap,
      PALETTE_SNAP_RANGE,
    ),
    spriteGap: pickSteppedNumber(value, 'spriteGap', QUANTISE_DEFAULT_DIALS.spriteGap, SPRITE_GAP_RANGE),
    symmetry: pick(value, 'symmetry', QUANTISE_DEFAULT_DIALS.symmetry, SYMMETRY_MODES),
    symmetryTolerance: pickSteppedNumber(
      value,
      'symmetryTolerance',
      QUANTISE_DEFAULT_DIALS.symmetryTolerance,
      SYMMETRY_TOLERANCE_RANGE,
    ),
    symmetryConfidence: pickSteppedNumber(
      value,
      'symmetryConfidence',
      QUANTISE_DEFAULT_DIALS.symmetryConfidence,
      SYMMETRY_CONFIDENCE_RANGE,
    ),
    duplicateTolerance: pickSteppedNumber(
      value,
      'duplicateTolerance',
      QUANTISE_DEFAULT_DIALS.duplicateTolerance,
      DUPLICATE_TOLERANCE_RANGE,
    ),
    duplicateSnap: pickBoolean(value, 'duplicateSnap', QUANTISE_DEFAULT_DIALS.duplicateSnap),
    frameAlignment: pick(
      value,
      'frameAlignment',
      QUANTISE_DEFAULT_DIALS.frameAlignment,
      FRAME_ALIGNMENT_MODES,
    ),
    frameDriftTolerance: pickSteppedNumber(
      value,
      'frameDriftTolerance',
      QUANTISE_DEFAULT_DIALS.frameDriftTolerance,
      FRAME_DRIFT_RANGE,
    ),
    antiAlias: pick(value, 'antiAlias', QUANTISE_DEFAULT_DIALS.antiAlias, ANTI_ALIAS_MODES),
    antiAliasThreshold: pickSteppedNumber(
      value,
      'antiAliasThreshold',
      QUANTISE_DEFAULT_DIALS.antiAliasThreshold,
      ANTI_ALIAS_THRESHOLD_RANGE,
    ),
    antiAliasStrength: pickSteppedNumber(
      value,
      'antiAliasStrength',
      QUANTISE_DEFAULT_DIALS.antiAliasStrength,
      ANTI_ALIAS_STRENGTH_RANGE,
    ),
    antiAliasRun: pickSteppedNumber(
      value,
      'antiAliasRun',
      QUANTISE_DEFAULT_DIALS.antiAliasRun,
      ANTI_ALIAS_RUN_RANGE,
    ),
    antiAliasPalette: pick(
      value,
      'antiAliasPalette',
      QUANTISE_DEFAULT_DIALS.antiAliasPalette,
      ANTI_ALIAS_PALETTES,
    ),
  };
}
