import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BACKGROUND_KEY_COLORS } from '../../constants/backgroundKeyColors.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
import { QUANTISE_DEFAULT_DIALS } from '../../constants/quantiseDials.ts';
import { DEFAULT_KEY_TOLERANCE } from '../../constants/quantiser.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useQuantiseAnswerStore } from '../../stores/useQuantiseAnswerStore.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import { imageFrom } from '../../test/images.ts';
import type { BackgroundKeying, QuantiseSettings } from '../../types/quantiser.ts';
import { quantiseImage } from '../../utils/quantiseImage.ts';
import { QuantisedSheetCaptureButton } from './QuantisedSheetCaptureButton.tsx';

/**
 * The route this button exists for, end to end: the sheet in the Quantise tab reaching the identity
 * lock without the reader finding the file again.
 *
 * `quantisedSheetCapture.test.ts` beside the function holds which states are offered and which are
 * refused. What is only assertable here is that the button reads the *result* out of the answer store
 * rather than the source out of the sheet store — the two differ by exactly the colours the reader
 * settled, which is the reason the route was worth building.
 */

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
/** A near-charcoal the reduction below folds into {@link CHARCOAL}, so source and result differ. */
const NEAR_CHARCOAL = { r: 32, g: 31, b: 38, a: 255 };

const SHEET = imageFrom(8, 4, (x, y) => {
  if (x < 5) return MAGENTA;
  return y === 0 ? NEAR_CHARCOAL : CHARCOAL;
});

/** Puts a sheet and an answer about it into the two stores, as the Quantise tab would have. */
function loadTab(key: BackgroundKeying | null) {
  const settings: QuantiseSettings = {
    ...TUNING,
    grid: 1,
    key,
    reduction: { kind: 'MAX_COLORS', maxColors: 1 },
  };
  useQuantiseStore.setState({ source: { name: 'accepted-sheet.png', image: SHEET } });
  useQuantiseAnswerStore.setState({
    succeeded: { settings, result: quantiseImage(SHEET, settings) },
  });
}

beforeEach(() => {
  useOutputStore.setState({
    output: { ...DEFAULT_OUTPUT_CONFIG, identityLock: '', backgroundKey: 'MAGENTA_FF00FF' },
  });
});

afterEach(() => {
  useQuantiseStore.setState({ source: null });
  useQuantiseAnswerStore.getState().reset();
});

describe('QuantisedSheetCaptureButton', () => {
  it('writes the quantised result’s colours into the lock, not the dropped sheet’s', () => {
    loadTab({ color: MAGENTA, tolerance: DEFAULT_KEY_TOLERANCE });
    render(<QuantisedSheetCaptureButton />);

    fireEvent.click(screen.getByRole('button', { name: 'Use the quantised sheet' }));

    // One colour, not two: the source carries a charcoal and a near-charcoal, and the reduction the
    // reader settled folded them together. Reading the source would have stated both.
    expect(useOutputStore.getState().output.identityLock).toBe('Palette: #1E1E24');
  });

  it('is unavailable while the tab holds no sheet', () => {
    render(<QuantisedSheetCaptureButton />);

    expect(screen.getByRole('button', { name: 'Use the quantised sheet' })).toBeDisabled();
  });

  it('is unavailable while the tab has not keyed the sheet', () => {
    loadTab(null);
    render(<QuantisedSheetCaptureButton />);

    expect(screen.getByRole('button', { name: 'Use the quantised sheet' })).toBeDisabled();
  });
});
