import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';
import { useQuantiseAnswerStore } from '../stores/useQuantiseAnswerStore.ts';
import { useQuantiseStore } from '../stores/useQuantiseStore.ts';
import type { PixelGrid, QuantiseSettings } from '../types/quantiser.ts';
import { createImage } from '../utils/imageData.ts';
import { quantiseImage } from '../utils/quantiseImage.ts';

const {
  keyingEnabled: _enabled,
  keyTolerance: _tolerance,
  paletteSnap: _snap,
  ...TUNING
} = QUANTISE_DEFAULT_DIALS;

/**
 * Puts a sheet and a finished result for it into the two quantiser stores, as the Quantise tab would
 * have, at a scale the reader typed — so a component reading the result on screen from the stores
 * finds one at `grid`, decided by a palette step or not.
 *
 * The result is a real transform of a blank 4 × 4 sheet, with only `paletted` stated, since no caller
 * reads its pixels from the store.
 */
export function showResult(grid: PixelGrid, paletted: boolean): void {
  const image = createImage(4, 4);
  const settings: QuantiseSettings = { ...TUNING, grid, key: null, reduction: null };
  useQuantiseStore.setState({ source: { name: 'shown.png', image }, gridOverride: grid });
  useQuantiseAnswerStore.getState().attempted({
    kind: 'quantised',
    settings,
    result: { ...quantiseImage(image, settings), paletted },
  });
}

/** Empties both stores, so a test starts with no sheet and no result on screen. */
export function showNoResult(): void {
  useQuantiseStore.setState({ source: null, gridOverride: null });
  useQuantiseAnswerStore.getState().reset();
}
