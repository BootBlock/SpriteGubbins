import { create } from 'zustand';
import { DEFAULT_KEY_TOLERANCE } from '../constants/quantiser.ts';
import type { ImportedImage, PixelGrid } from '../types/quantiser.ts';
import { loadSheet, releaseSheet } from '../workers/quantiseSession.ts';
import { useQuantiseAnswerStore } from './useQuantiseAnswerStore.ts';

/**
 * The sheet being quantised, and the scale the user chose for it.
 *
 * A store rather than the tab's own `useState`, because **the workflow crosses tabs**. The colour
 * budget and the target component size are studio settings by design — the quantiser reads them
 * rather than offering a second copy — so going to the studio to change one and coming back is the
 * ordinary case, not an edge. `App` swaps the whole view on navigation, which unmounts the tab, and
 * local state would drop the image on every one of those trips.
 *
 * **The two actions that change the sheet are also where the pipeline is told**, rather than an
 * effect in the tab noticing afterwards. Those are the same thing while the tab is mounted and a
 * very different thing when it is not: an effect keyed on the image re-runs on every remount, so
 * every trip to the studio and back re-sent a sheet the worker was already holding. Here it is sent
 * when it actually arrives, once, and `useQuantiseAnswerStore` keeps what came back.
 *
 * Nothing here is persisted. The plan is explicit that no image is written to the database: it is
 * the user's, this is a transform, and keeping sheets in OPFS is a different feature with its own
 * quota questions. This survives navigation, not a reload.
 */
export interface QuantiseState {
  readonly source: ImportedImage | null;
  /**
   * The scale the user asked for, or `null` to use whatever detection found.
   *
   * Nullable rather than defaulted, because "no answer yet" is a real state the tab shows: an image
   * with no detectable grid and no override has no result, and the panel says so instead of
   * guessing.
   */
  readonly gridOverride: PixelGrid | null;
  /**
   * Whether the studio's background key is replaced with transparency.
   *
   * **Off by default, and opt-in.** Keying deletes pixels, and two of the four offered keys —
   * `PURE_WHITE` and `PURE_BLACK` — share their colour with real artwork, so a tolerance loose enough
   * to catch a drifting white field also takes the sheet's own highlights. Off by default means that
   * never happens to someone who did not ask for it. It is also what keeps the panel's own promise
   * honest: it says every colour in the result is one the image already contained, and silently
   * removing a third of the sheet would contradict that.
   */
  readonly keyingEnabled: boolean;
  /** How far a pixel may sit from the key colour, as Euclidean RGB distance. */
  readonly keyTolerance: number;

  setSource(source: ImportedImage): void;
  setGridOverride(gridOverride: PixelGrid | null): void;
  setKeyingEnabled(keyingEnabled: boolean): void;
  setKeyTolerance(keyTolerance: number): void;
  /** Put the tab back where it opened: no sheet, and every control at its default. */
  clear(): void;
}

/** What the tab opens with, and what `clear` puts back. */
const EMPTY: Pick<QuantiseState, 'source' | 'gridOverride' | 'keyingEnabled' | 'keyTolerance'> = {
  source: null,
  gridOverride: null,
  keyingEnabled: false,
  keyTolerance: DEFAULT_KEY_TOLERANCE,
};

export const useQuantiseStore = create<QuantiseState>((set) => ({
  ...EMPTY,

  // Clearing the override is part of taking a new image, not a separate step a caller can forget: a
  // grid chosen for the last sheet says nothing about this one, and carrying it over would show a
  // confident result at a scale nobody claimed applied.
  //
  // **The keying settings deliberately survive**, and the asymmetry is the point. A grid is a
  // measurement of one particular image, so a stale one silently mis-scales the next. Keying is a
  // standing intent about a workflow — the splitter hands back eight sheets that are eight passes at
  // the same settings — and unlike a wrong grid its effect is plainly visible in the preview, so
  // carrying it over cannot mislead anyone the way a carried-over grid would.
  setSource: (source) => {
    set({ source, gridOverride: null });
    // In this order, and both before the load: every answer in the store is about the sheet being
    // replaced, so leaving one in place for the render between here and the worker's first reply
    // would caption the new sheet with the old one's colour count and detected scale.
    useQuantiseAnswerStore.getState().forget();
    loadSheet(source.image);
  },

  setGridOverride: (gridOverride) => {
    set({ gridOverride });
  },

  setKeyingEnabled: (keyingEnabled) => {
    set({ keyingEnabled });
  },

  setKeyTolerance: (keyTolerance) => {
    set({ keyTolerance });
  },

  // Everything, including the keying settings that deliberately survive `setSource`. The asymmetry is
  // the difference between the two actions: dropping a second sheet continues a workflow — the
  // splitter hands back eight passes at the same settings — while clearing is the user saying they
  // are finished with this one. A "Clear" that left a tolerance and a toggle behind would be a
  // half-clear, and the next sheet would arrive already keyed by a decision made about the last one.
  clear: () => {
    set({ ...EMPTY });
    useQuantiseAnswerStore.getState().forget();
    // The thread goes with the sheet. It is holding the only other copy of the image, plus whatever
    // a transform still running had allocated, and a cleared tab has no use for either.
    releaseSheet();
  },
}));
