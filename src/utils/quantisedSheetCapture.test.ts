import { describe, expect, it } from 'vitest';
import { BACKGROUND_KEY_COLORS } from '../constants/backgroundKeyColors.ts';
import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';
import { DEFAULT_KEY_TOLERANCE } from '../constants/quantiser.ts';
import { IDENTITY_CAPTURE_UNAVAILABLE } from '../constants/identityCapture.ts';
import { imageFrom } from '../test/images.ts';
import type { BackgroundKeying, ImportedImage } from '../types/quantiser.ts';
import { quantiseImage } from './quantiseImage.ts';
import { quantisedSheetCapture } from './quantisedSheetCapture.ts';

const {
  keyingEnabled: _enabled,
  keyTolerance: _tolerance,
  paletteSnap: _snap,
  ...TUNING
} = QUANTISE_DEFAULT_DIALS;
const MAGENTA = BACKGROUND_KEY_COLORS.MAGENTA_FF00FF;
// A colour rather than `Rgba | null`: `BACKGROUND_KEY_COLORS` answers `null` for `TRANSPARENT`, and
// narrowing it here once beats a cast at every use.
if (MAGENTA === null) throw new Error('MAGENTA_FF00FF names no colour');
const CHARCOAL = { r: 30, g: 30, b: 36, a: 255 };

/** A keyed sheet at its own pixel scale: magenta field, one charcoal subject region. */
const SHEET: ImportedImage = {
  name: 'accepted-sheet.png',
  image: imageFrom(8, 4, (x) => (x < 5 ? MAGENTA : CHARCOAL)),
};

/** The pipeline's real answer, so the shape under test is the one the store actually holds. */
function resultOf(key: BackgroundKeying | null) {
  return quantiseImage(SHEET.image, { ...TUNING, grid: 1, key, reduction: null });
}

const KEYED = { color: MAGENTA, tolerance: DEFAULT_KEY_TOLERANCE };

describe('quantisedSheetCapture', () => {
  it('offers the result rather than the sheet that was dropped', () => {
    const result = resultOf(KEYED);

    expect(quantisedSheetCapture(SHEET, result, KEYED, MAGENTA)).toEqual({
      kind: 'READY',
      // The name is the dropped file's, because that is what the confirmation names — but the pixels
      // are the transform's, which is the whole point of the route.
      sheet: { name: 'accepted-sheet.png', image: result.image },
    });
  });

  it('refuses a tab holding no sheet', () => {
    expect(quantisedSheetCapture(null, null, null, MAGENTA)).toEqual({
      kind: 'UNAVAILABLE',
      reason: IDENTITY_CAPTURE_UNAVAILABLE.noSheet,
    });
  });

  it('refuses a sheet the tab has not produced a result for', () => {
    expect(quantisedSheetCapture(SHEET, null, null, MAGENTA)).toEqual({
      kind: 'UNAVAILABLE',
      reason: IDENTITY_CAPTURE_UNAVAILABLE.noResult,
    });
  });

  it('refuses a result the tab did not key, because the field would lead the palette', () => {
    expect(quantisedSheetCapture(SHEET, resultOf(null), null, MAGENTA)).toEqual({
      kind: 'UNAVAILABLE',
      reason: IDENTITY_CAPTURE_UNAVAILABLE.keyStillOn,
    });
  });

  it('accepts an unkeyed result where the studio names no key colour', () => {
    // `TRANSPARENT`: the tab's keying pass cannot run at all, so its being off says nothing about
    // whether the sheet carries a field — and the space between components is alpha already.
    expect(quantisedSheetCapture(SHEET, resultOf(null), null, null).kind).toBe('READY');
  });
});
