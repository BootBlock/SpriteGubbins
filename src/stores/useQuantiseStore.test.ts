import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_KEY_TOLERANCE } from '../constants/quantiser.ts';
import { createImage } from '../utils/imageData.ts';
import { useQuantiseStore } from './useQuantiseStore.ts';

const SHEET = { name: 'returned-sheet.png', image: createImage(4, 4) };

beforeEach(() => {
  useQuantiseStore.getState().clear();
});

describe('useQuantiseStore', () => {
  it('drops a grid chosen for the previous sheet when a new one arrives', () => {
    // A grid is a measurement of one particular image, so carrying it over would show a confident
    // result at a scale nobody claimed applied to this one.
    const store = useQuantiseStore.getState();
    store.setSource(SHEET);
    store.setGridOverride(8);
    store.setSource({ name: 'another.png', image: createImage(8, 8) });

    expect(useQuantiseStore.getState().gridOverride).toBeNull();
  });

  it('carries the keying settings across a new sheet, deliberately', () => {
    // The asymmetry with the grid above. Keying is a standing intent about a workflow — a split rig
    // hands back eight sheets that are eight passes at the same settings — and unlike a wrong grid its
    // effect is plainly visible in the preview, so carrying it over cannot mislead anyone.
    const store = useQuantiseStore.getState();
    store.setSource(SHEET);
    store.setKeyingEnabled(true);
    store.setKeyTolerance(96);
    store.setSource({ name: 'another.png', image: createImage(8, 8) });

    expect(useQuantiseStore.getState().keyingEnabled).toBe(true);
    expect(useQuantiseStore.getState().keyTolerance).toBe(96);
  });

  it('clears the sheet and every control with it', () => {
    // What "Clear" has to mean, and the reason it is not `setSource(null)`: a half-clear would leave
    // the next sheet arriving already keyed by a decision made about the last one.
    const store = useQuantiseStore.getState();
    store.setSource(SHEET);
    store.setGridOverride(16);
    store.setKeyingEnabled(true);
    store.setKeyTolerance(128);

    store.clear();

    expect(useQuantiseStore.getState()).toMatchObject({
      source: null,
      gridOverride: null,
      keyingEnabled: false,
      keyTolerance: DEFAULT_KEY_TOLERANCE,
    });
  });
});
