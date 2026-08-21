import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QUANTISE_DEFAULT_DIALS, QUANTISE_DIAL_KEYS } from '../constants/quantiseDials.ts';
import {
  DEFAULT_CLEANUP_PASSES,
  DEFAULT_COLOR_MERGE,
  DEFAULT_KEY_TOLERANCE,
  DEFAULT_PALETTE_SNAP,
  DEFAULT_SPRITE_GAP,
  DEFAULT_SYMMETRY,
  DEFAULT_SYMMETRY_CONFIDENCE,
  DEFAULT_SYMMETRY_TOLERANCE,
} from '../constants/quantiser.ts';
import { FakeWorker } from '../test/fakeWorker.ts';
import { canUndoDials, currentDials } from '../utils/dialHistory.ts';
import { createImage } from '../utils/imageData.ts';
import { useQuantiseAnswerStore } from './useQuantiseAnswerStore.ts';
import { useQuantiseStore } from './useQuantiseStore.ts';

const SHEET = { name: 'returned-sheet.png', image: createImage(4, 4) };

const LOCK = {
  entries: [{ r: 40, g: 160, b: 60, a: 255 }],
  setting: 'RESTRAINED_64_COLOR',
  sheetName: 'returned-sheet.png',
};

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

  it('carries a locked palette across a new sheet, which is the whole of what a lock is for', () => {
    // The strongest case of the three, and the one that would be a defect rather than an
    // inconvenience if it fell: a palette locked from sheet one exists to colour sheets two to
    // eight, so a lock dropped by `setSource` could only ever be applied to the sheet it came from,
    // where it does nothing.
    const store = useQuantiseStore.getState();
    store.setSource(SHEET);
    store.lockPalette(LOCK);
    store.setPaletteSnap(32);
    store.setSource({ name: 'another.png', image: createImage(8, 8) });

    expect(useQuantiseStore.getState().lockedPalette).toEqual(LOCK);
    expect(useQuantiseStore.getState().paletteSnap).toBe(32);
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
    store.lockPalette(LOCK);
    store.setPaletteSnap(48);
    store.setSpriteGap(6);

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
      dither: 'NONE' as const,
      outlineExpansion: 0,
      colorMerge: 0,
      // Including the lock, which survives a new sheet and falls only here: clearing is the reader
      // saying they have finished with this series, not moving on to the next sheet of it.
      lockedPalette: null,
      paletteSnap: DEFAULT_PALETTE_SNAP,
      spriteGap: DEFAULT_SPRITE_GAP,
      symmetry: DEFAULT_SYMMETRY,
      symmetryTolerance: DEFAULT_SYMMETRY_TOLERANCE,
      symmetryConfidence: DEFAULT_SYMMETRY_CONFIDENCE,
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

describe('the dial history the store keeps', () => {
  it('steps a dial back to where it was, and forward again', () => {
    const store = useQuantiseStore.getState();
    store.setColorMerge(24);
    store.setCleanupPasses(3);

    store.undo();
    expect(useQuantiseStore.getState().cleanupPasses).toBe(DEFAULT_CLEANUP_PASSES);
    expect(useQuantiseStore.getState().colorMerge).toBe(24);

    store.undo();
    expect(useQuantiseStore.getState().colorMerge).toBe(DEFAULT_COLOR_MERGE);

    store.redo();
    expect(useQuantiseStore.getState().colorMerge).toBe(24);
  });

  it('does nothing at either end of the stack', () => {
    const store = useQuantiseStore.getState();
    store.undo();
    store.redo();

    expect(useQuantiseStore.getState().colorMerge).toBe(DEFAULT_COLOR_MERGE);
  });

  it('makes a preset load one step, and steps back to what it replaced', () => {
    // The reason this is worth having at all: a saved set moves thirteen dials at once, and the
    // positions a reader spent ten minutes finding are the ones it replaced.
    const store = useQuantiseStore.getState();
    store.setColorMerge(24);
    store.applyDials({ ...QUANTISE_DEFAULT_DIALS, fillCleanup: 32, vote: 'K_CENTROID' });

    store.undo();

    expect(useQuantiseStore.getState()).toMatchObject({
      colorMerge: 24,
      fillCleanup: 0,
      vote: 'DOMINANT',
    });
  });

  it('keeps the stack across a new sheet, and drops it on Clear', () => {
    // The same asymmetry the dials themselves have: dropping the next sheet of a series continues
    // the workflow, and clearing is the reader saying they have finished with it.
    const store = useQuantiseStore.getState();
    store.setSource(SHEET);
    store.setColorMerge(24);
    store.setSource({ name: 'another.png', image: createImage(8, 8) });

    store.undo();
    expect(useQuantiseStore.getState().colorMerge).toBe(DEFAULT_COLOR_MERGE);

    store.setColorMerge(36);
    store.clear();
    expect(useQuantiseStore.getState().history.entries).toHaveLength(1);
    expect(canUndoDials(useQuantiseStore.getState().history)).toBe(false);
  });

  it('holds a position rather than a sheet, whatever is loaded when it is taken', () => {
    // Every entry is thirteen primitives. An entry that reached the store object instead would pin
    // the sheet it was taken with — up to sixty-seven megabytes a step, fifty steps deep.
    const store = useQuantiseStore.getState();
    store.setSource(SHEET);
    store.lockPalette(LOCK);
    store.setColorMerge(24);

    const entry = useQuantiseStore.getState().history.entries.at(-1);
    expect(Object.keys(entry?.dials ?? {}).sort()).toEqual([...QUANTISE_DIAL_KEYS].sort());
  });

  it('keeps every dial field equal to the position the stack is at', () => {
    // The invariant the whole arrangement rests on: the flat fields each control selects from are a
    // projection of the history, so a write that reached one without the other would be a position
    // no undo could return to.
    const store = useQuantiseStore.getState();
    store.setKeyingEnabled(true);
    store.setKeyTolerance(64);
    store.setVote('INK_WEIGHTED');
    store.setDither('BAYER_8');
    store.setOutlineExpansion(2);
    store.setLineStrength(2);
    store.setTrimStrength(1);
    store.setInkThreshold(96);
    store.setFillCleanup(32);
    store.setColorMerge(24);
    store.setCleanupPasses(3);
    store.setPaletteSnap(24);
    store.setSpriteGap(6);
    store.undo();
    store.undo();
    store.redo();

    const state = useQuantiseStore.getState();
    const held = currentDials(state.history);
    for (const key of QUANTISE_DIAL_KEYS) expect(state[key]).toBe(held[key]);
  });
});
