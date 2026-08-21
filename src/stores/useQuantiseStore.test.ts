import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_KEY_TOLERANCE } from '../constants/quantiser.ts';
import { FakeWorker } from '../test/fakeWorker.ts';
import { createImage } from '../utils/imageData.ts';
import { useQuantiseAnswerStore } from './useQuantiseAnswerStore.ts';
import { useQuantiseStore } from './useQuantiseStore.ts';

const SHEET = { name: 'returned-sheet.png', image: createImage(4, 4) };

/** The thread the last `setSource` started. */
function thread(): FakeWorker {
  const started = FakeWorker.started.at(-1);
  if (started === undefined) throw new Error('no thread was started');
  return started;
}

beforeEach(() => {
  useQuantiseStore.getState().clear();
  FakeWorker.started = [];
  vi.stubGlobal('Worker', FakeWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
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
    store.setKeyTolerance(32);
    store.setSource({ name: 'another.png', image: createImage(8, 8) });

    expect(useQuantiseStore.getState().keyingEnabled).toBe(true);
    expect(useQuantiseStore.getState().keyTolerance).toBe(32);
  });

  it('carries the downscale reading across a new sheet, for the same reason', () => {
    // Which reading suits a sheet is a judgement about the artwork's style, and a split rig's
    // eight sheets are one style — so the choice is workflow intent, exactly as the keying is.
    const store = useQuantiseStore.getState();
    store.setSource(SHEET);
    store.setVote('INK_WEIGHTED');
    store.setLineStrength(2.5);
    store.setTrimStrength(1.2);
    store.setInkThreshold(80);
    store.setCleanupPasses(3);
    store.setFillCleanup(48);
    store.setColorMerge(24);
    store.setSource({ name: 'another.png', image: createImage(8, 8) });

    expect(useQuantiseStore.getState().vote).toBe('INK_WEIGHTED');
    expect(useQuantiseStore.getState().lineStrength).toBe(2.5);
    expect(useQuantiseStore.getState().trimStrength).toBe(1.2);
    expect(useQuantiseStore.getState().inkThreshold).toBe(80);
    expect(useQuantiseStore.getState().cleanupPasses).toBe(3);
    expect(useQuantiseStore.getState().fillCleanup).toBe(48);
    expect(useQuantiseStore.getState().colorMerge).toBe(24);
  });

  it('clears the sheet and every control with it', () => {
    // What "Clear" has to mean, and the reason it is not `setSource(null)`: a half-clear would leave
    // the next sheet arriving already keyed by a decision made about the last one.
    const store = useQuantiseStore.getState();
    store.setSource(SHEET);
    store.setGridOverride(16);
    store.setKeyingEnabled(true);
    store.setKeyTolerance(64);
    store.setVote('K_CENTROID');
    store.setLineStrength(2);
    store.setFillCleanup(32);
    store.setColorMerge(36);

    store.clear();

    expect(useQuantiseStore.getState()).toMatchObject({
      source: null,
      gridOverride: null,
      keyingEnabled: false,
      keyTolerance: DEFAULT_KEY_TOLERANCE,
      vote: 'DOMINANT',
      lineStrength: 1.5,
      trimStrength: 0,
      inkThreshold: 64,
      fillCleanup: 0,
      cleanupPasses: 1,
      outlineExpansion: 0,
      colorMerge: 0,
    });
  });

  it('sends the sheet to the worker as it arrives, once', () => {
    // Here rather than in an effect in the tab, because an effect keyed on the image re-runs on
    // every remount — and `App` unmounts the tab on every trip to the studio and back, which is how
    // the ordinary use of this feature came to re-send a sheet of up to 67 megabytes each way.
    const store = useQuantiseStore.getState();
    store.setSource(SHEET);

    expect(thread().of('load')).toHaveLength(1);
    expect(thread().of('load')[0]?.request).toEqual({ kind: 'load', image: SHEET.image });
  });

  it('forgets what was measured about the sheet being replaced', () => {
    const store = useQuantiseStore.getState();
    store.setSource(SHEET);
    thread().answer({
      id: thread().lastId('load'),
      kind: 'loaded',
      facts: { scale: { grid: 8, measurement: 'EXACT' }, colors: 1024 },
    });

    store.setSource({ name: 'another.png', image: createImage(8, 8) });

    // A colour count and a detected scale are measurements of one particular image. Left in place
    // they would caption the new sheet with the old one's numbers until the worker answered.
    expect(useQuantiseAnswerStore.getState().survey).toBeNull();
  });

  it('ends the session when the tab is cleared', () => {
    const store = useQuantiseStore.getState();
    store.setSource(SHEET);
    const started = thread();

    store.clear();

    expect(started.terminated).toBe(true);
  });
});
