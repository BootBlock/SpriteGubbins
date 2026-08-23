import { act, fireEvent, render, screen } from '@testing-library/react';
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
import { colorPlanFor } from '../../utils/colorReduction.ts';
import { quantiseImage } from '../../utils/quantiseImage.ts';
import { QuantisedSheetCaptureButton } from './QuantisedSheetCaptureButton.tsx';

/**
 * The route this button exists for, end to end: the sheet in the Quantise tab reaching the identity
 * lock without the reader finding the file again.
 *
 * `quantisedSheetCapture.test.ts` beside the function holds which states are offered and which are
 * refused. What is only assertable here is the wiring — that the studio rebuilds what the tab is
 * asking for out of the same stores, and that what it writes is the **result** rather than the source
 * the tab was handed. The two differ by exactly the reduction the reader settled, which is the reason
 * the route was worth building.
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
/** A near-charcoal the grid reading below votes away, so source and result differ. */
const NEAR_CHARCOAL = { r: 32, g: 31, b: 38, a: 255 };

const GRID = 2;

/**
 * A 12 × 8 sheet: a magenta field, and a 4 × 4 subject speckled with a second charcoal.
 *
 * The speckle is one pixel in each 2 × 2 cell, so the dominant vote at a grid of 2 resolves every
 * cell to {@link CHARCOAL} and the result carries one subject colour where the source carries two.
 * That difference survives whatever colour budget the studio's defaults produce, which a difference
 * made by the reduction would not. The whole border is on the key, because the guard that decides
 * whether the field survived reads the border.
 */
const SHEET = imageFrom(12, 8, (x, y) => {
  if (x < 4 || x > 7 || y < 2 || y > 5) return MAGENTA;
  return x % 2 === 0 && y % 2 === 0 ? NEAR_CHARCOAL : CHARCOAL;
});

/** Puts a sheet and an answer about it into the two stores, as the Quantise tab would have. */
function loadTab(key: BackgroundKeying | null) {
  const { output } = useOutputStore.getState();
  const settings: QuantiseSettings = {
    ...TUNING,
    grid: GRID,
    key,
    // The studio's own colour setting, resolved the way the tab resolves it — so the answer filed
    // here is an answer to the question the button will rebuild, and the staleness guard passes.
    reduction: colorPlanFor(output.palette, output.paletteLimit, null, QUANTISE_DEFAULT_DIALS.paletteSnap)
      .reduction,
  };
  useQuantiseStore.setState({
    source: { name: 'accepted-sheet.png', image: SHEET },
    gridOverride: GRID,
    keyingEnabled: key !== null,
    keyTolerance: DEFAULT_KEY_TOLERANCE,
  });
  useQuantiseAnswerStore.setState({ succeeded: { settings, result: quantiseImage(SHEET, settings) } });
}

beforeEach(() => {
  useOutputStore.setState({
    output: { ...DEFAULT_OUTPUT_CONFIG, identityLock: '', backgroundKey: 'MAGENTA_FF00FF' },
  });
});

afterEach(() => {
  useQuantiseStore.setState({ ...QUANTISE_DEFAULT_DIALS, source: null, gridOverride: null });
  useQuantiseAnswerStore.getState().reset();
});

const theButton = () => screen.getByRole('button', { name: 'Use the quantised sheet' });

describe('QuantisedSheetCaptureButton', () => {
  it('writes the quantised result’s colours into the lock, not the dropped sheet’s', () => {
    loadTab({ color: MAGENTA, tolerance: DEFAULT_KEY_TOLERANCE });
    render(<QuantisedSheetCaptureButton />);

    fireEvent.click(theButton());

    // One colour, not two: the source carries a charcoal and a near-charcoal, and the grid reading
    // the reader settled voted the second away. Reading the source would have stated both.
    expect(useOutputStore.getState().output.identityLock).toBe('Palette: #1E1E24');
  });

  it('is unavailable while the tab holds no sheet', () => {
    render(<QuantisedSheetCaptureButton />);

    expect(theButton()).toBeDisabled();
  });

  it('is unavailable while the sheet still carries its background key', () => {
    loadTab(null);
    render(<QuantisedSheetCaptureButton />);

    expect(theButton()).toBeDisabled();
  });

  it('is unavailable once the studio’s background key has moved past the result', () => {
    loadTab({ color: MAGENTA, tolerance: DEFAULT_KEY_TOLERANCE });
    render(<QuantisedSheetCaptureButton />);
    expect(theButton()).toBeEnabled();

    // The tab is unmounted, so nothing recomputes: the answer in the store now describes a question
    // nobody is asking.
    act(() => {
      useOutputStore.getState().setOutputField('backgroundKey', 'PURE_WHITE');
    });

    expect(theButton()).toBeDisabled();
  });
});
