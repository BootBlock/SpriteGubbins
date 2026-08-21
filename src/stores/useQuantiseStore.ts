import { create } from 'zustand';
import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';
import type { TunedDials } from '../types/autoTune.ts';
import type { DialHistory, DialKey } from '../types/quantiseHistory.ts';
import type { QuantiseDials } from '../types/quantisePreset.ts';
import type {
  DitherPattern,
  ImportedImage,
  LockedPalette,
  PixelGrid,
  SymmetryMode,
  VoteMethod,
} from '../types/quantiser.ts';
import { currentDials, openHistory, recordDials, redoDials, undoDials } from '../utils/dialHistory.ts';
import { loadSheet, releaseSheet } from '../workers/quantiseSession.ts';
import { useAutoTuneStore } from './useAutoTuneStore.ts';
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
export interface QuantiseState extends QuantiseDials {
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
   * The palette taken off an earlier result and held for the sheets that follow, or `null`.
   *
   * **The one setting here whose whole purpose is to outlive the sheet it was taken from.** Where
   * the grid is a measurement of one image and falls with it, this is a statement about a *series*:
   * it is taken from sheet one so that sheets two to eight are drawn in the same colours, and a lock
   * that fell to `setSource` could never be applied to anything. It falls to `clear`, with every
   * other standing intent, because that is the reader saying they have finished with this workflow.
   */
  readonly lockedPalette: LockedPalette | null;
  /**
   * Every position the dials have been in this session, and which of them they are at.
   *
   * **The dial fields above are a projection of this**, not a second copy of it: every path that
   * writes a dial records the new position here and then spreads that entry back over the fields.
   * They are kept flat because that is what lets each control hold an atomic selector — a panel
   * subscribed to `state.history` would re-render on every dial in the tab — and the projection is
   * what keeps the two from ever disagreeing. A setter that wrote a field directly would break
   * that, and the position it wrote would be the one an undo could not reach.
   */
  readonly history: DialHistory;

  setSource(source: ImportedImage): void;
  setGridOverride(gridOverride: PixelGrid | null): void;
  setKeyingEnabled(keyingEnabled: boolean): void;
  setKeyTolerance(keyTolerance: number): void;
  setVote(vote: VoteMethod): void;
  setOutlineExpansion(outlineExpansion: number): void;
  setLineStrength(lineStrength: number): void;
  setTrimStrength(trimStrength: number): void;
  setInkThreshold(inkThreshold: number): void;
  setFillCleanup(fillCleanup: number): void;
  setColorMerge(colorMerge: number): void;
  setCleanupPasses(cleanupPasses: number): void;
  setDither(dither: DitherPattern): void;
  /** Hold this palette, replacing whichever one was held before. */
  lockPalette(lockedPalette: LockedPalette): void;
  /** Let the held palette go, handing the colour decision back to the studio. */
  unlockPalette(): void;
  setPaletteSnap(paletteSnap: number): void;
  setSpriteGap(spriteGap: number): void;
  setSymmetry(symmetry: SymmetryMode): void;
  setSymmetryTolerance(symmetryTolerance: number): void;
  setSymmetryConfidence(symmetryConfidence: number): void;
  setDuplicateTolerance(duplicateTolerance: number): void;
  setDuplicateSnap(duplicateSnap: boolean): void;
  /**
   * Put every dial where a saved preset says, in one move.
   *
   * One `set` rather than eighteen, and the difference is not tidiness. `useQuantiseWork` holds the
   * transform behind a 250ms debounce keyed on the settings' identity, and `QuantiseTab` rebuilds
   * that identity whenever any dial changes — so eighteen separate writes would restart the timer
   * eighteen times and the transform would run once, `QUANTISE_DEBOUNCE_MS` after the *last* of
   * them. One write starts one window. (No intermediate transform is ever *begun*: the effect's
   * cleanup clears the pending timer, which is what the debounce is for.)
   *
   * It reaches the dials and nothing else. The sheet stays, the grid stays, and a held palette
   * stays: see {@link QuantiseDials} for why none of those three is a preset's to move.
   */
  applyDials(dials: QuantiseDials): void;
  /**
   * Put the dials the auto-tune sweep swept where the sweep says, in one move.
   *
   * Separate from {@link applyDials} because it moves a *subset* — see `TunedDials` for which dials
   * a fidelity score may honestly rank and why the rest are excluded — and typed as that subset so a
   * sweep cannot reach a dial it was never allowed to sweep. Like a preset load it lands as one step
   * on the stack, which is what makes the whole answer reversible by one press.
   */
  autoTuned(dials: TunedDials): void;
  /**
   * Put the dials back where they were before the last change, if there is one.
   *
   * The dials and nothing else. The sheet, the pixel grid and a held palette are not on the stack —
   * a grid is a measurement of one image and a lock is a statement about a series, and neither is a
   * position a reader arrived at by moving a control they can see. See {@link QuantiseDials} for
   * the same line drawn for what a preset holds.
   */
  undo(): void;
  /** Step forward again into whatever the last {@link undo} stepped out of. */
  redo(): void;
  /** Put the tab back where it opened: no sheet, and every control at its default. */
  clear(): void;
}

/**
 * What the tab opens with, and what `clear` puts back.
 *
 * The dials come from `QUANTISE_DEFAULT_DIALS` rather than being listed again: they are the same
 * set a preset holds and the same set the parser falls back to, and three hand-written copies of
 * one list is three places for one of them to be forgotten. What is written out here is only what a
 * *dial* is not — the sheet, the grid, the held palette, and the undo stack, which opens holding
 * that one set of positions with nothing yet to step back from.
 */
const EMPTY: Pick<QuantiseState, 'source' | 'gridOverride' | 'lockedPalette' | 'history'> & QuantiseDials = {
  ...QUANTISE_DEFAULT_DIALS,
  source: null,
  gridOverride: null,
  lockedPalette: null,
  history: openHistory(QUANTISE_DEFAULT_DIALS),
};

export const useQuantiseStore = create<QuantiseState>((set, get) => {
  /**
   * The one write the dials have, in both directions: a history to project into the flat fields.
   *
   * Every dial path below goes through this or through {@link edit}, which is what makes the
   * projection described on `history` true rather than intended.
   */
  const project = (history: DialHistory) => {
    set({ ...currentDials(history), history });
  };

  /**
   * Move one dial, recording where the set now stands.
   *
   * The patch is applied to the history's current position rather than to the store's fields, and
   * the two are the same value — see `history`. Taking it from there is what lets this stay one
   * function for eighteen dials without a hand-written list of them to copy the other seventeen.
   *
   * `performance.now()` rather than `Date.now()`, because the only thing the figure is compared
   * with is another one of its own — the gap between two events of one gesture — and a monotonic
   * clock cannot be stepped backwards by the system underneath a drag.
   */
  const edit = (key: DialKey, patch: Partial<QuantiseDials>) => {
    const history = get().history;
    project(recordDials(history, { ...currentDials(history), ...patch }, key, performance.now()));
  };

  return {
    ...EMPTY,

    // Clearing the override is part of taking a new image, not a separate step a caller can forget:
    // a grid chosen for the last sheet says nothing about this one, and carrying it over would show
    // a confident result at a scale nobody claimed applied.
    //
    // **The keying settings deliberately survive**, and the asymmetry is the point. A grid is a
    // measurement of one particular image, so a stale one silently mis-scales the next. Keying is a
    // standing intent about a workflow — the splitter hands back eight sheets that are eight passes
    // at the same settings — and unlike a wrong grid its effect is plainly visible in the preview,
    // so carrying it over cannot mislead anyone the way a carried-over grid would.
    //
    // **The locked palette survives for a stronger reason still**: carrying it to the next sheet is
    // not a convenience but the entire feature. A lock that fell here would only ever be applied to
    // the sheet it was taken from, where it does nothing.
    //
    // **The undo stack survives too**, for the same reason as the dials it is a record of: the
    // positions a reader is stepping through are their way of reading this generator's output
    // rather than facts about one file, and a stack emptied by the next sheet would take away the
    // way back from a change made on the sheet before it.
    setSource: (source) => {
      set({ source, gridOverride: null });
      // In this order, and both before the load: every answer in the store is about the sheet being
      // replaced, so leaving one in place for the render between here and the worker's first reply
      // would caption the new sheet with the old one's colour count and detected scale.
      useQuantiseAnswerStore.getState().forget();
      // And the sweep's report with them, for the same reason and one of its own: a sweep may still
      // be running for the sheet being replaced, and moving the run number on is what disowns its
      // answer rather than letting it caption the new sheet. See `useAutoTuneStore`.
      useAutoTuneStore.getState().forget();
      loadSheet(source.image);
    },

    setGridOverride: (gridOverride) => {
      set({ gridOverride });
    },

    setKeyingEnabled: (keyingEnabled) => {
      edit('keyingEnabled', { keyingEnabled });
    },

    setKeyTolerance: (keyTolerance) => {
      edit('keyTolerance', { keyTolerance });
    },

    setVote: (vote) => {
      edit('vote', { vote });
    },

    setDither: (dither) => {
      edit('dither', { dither });
    },

    setOutlineExpansion: (outlineExpansion) => {
      edit('outlineExpansion', { outlineExpansion });
    },

    setLineStrength: (lineStrength) => {
      edit('lineStrength', { lineStrength });
    },

    setTrimStrength: (trimStrength) => {
      edit('trimStrength', { trimStrength });
    },

    setInkThreshold: (inkThreshold) => {
      edit('inkThreshold', { inkThreshold });
    },

    setFillCleanup: (fillCleanup) => {
      edit('fillCleanup', { fillCleanup });
    },

    setColorMerge: (colorMerge) => {
      edit('colorMerge', { colorMerge });
    },

    setCleanupPasses: (cleanupPasses) => {
      edit('cleanupPasses', { cleanupPasses });
    },

    lockPalette: (lockedPalette) => {
      set({ lockedPalette });
    },

    unlockPalette: () => {
      set({ lockedPalette: null });
    },

    setPaletteSnap: (paletteSnap) => {
      edit('paletteSnap', { paletteSnap });
    },

    setSpriteGap: (spriteGap) => {
      edit('spriteGap', { spriteGap });
    },

    setSymmetry: (symmetry) => {
      edit('symmetry', { symmetry });
    },

    setSymmetryTolerance: (symmetryTolerance) => {
      edit('symmetryTolerance', { symmetryTolerance });
    },

    setSymmetryConfidence: (symmetryConfidence) => {
      edit('symmetryConfidence', { symmetryConfidence });
    },

    setDuplicateTolerance: (duplicateTolerance) => {
      edit('duplicateTolerance', { duplicateTolerance });
    },

    setDuplicateSnap: (duplicateSnap) => {
      edit('duplicateSnap', { duplicateSnap });
    },

    // Recorded under no key for the reason a preset load is: it moves eight dials at once, and the
    // positions it replaced are exactly what a reader wants back after seeing what the sweep made of
    // their sheet. Spread over the current position rather than replacing it, because the ten dials
    // the sweep does not touch have to stay exactly where the reader put them.
    autoTuned: (dials) => {
      const history = get().history;
      project(recordDials(history, { ...currentDials(history), ...dials }, null, performance.now()));
    },

    applyDials: (dials) => {
      // Recorded under no key, so it never coalesces with the drag that happened to precede it: a
      // preset load moves every dial at once, and the position it replaced is exactly the one a
      // reader wants back after trying somebody else's settings on their sheet.
      //
      // Projected rather than spread as one field, because the dials are held flat: the store *is* a
      // `QuantiseDials` plus the things that are not one, which is what lets every control keep its
      // atomic selector and lets the compiler refuse a dial that has been added to the set and
      // forgotten here.
      project(recordDials(get().history, dials, null, performance.now()));
    },

    undo: () => {
      project(undoDials(get().history));
    },

    redo: () => {
      project(redoDials(get().history));
    },

    // Everything, including the keying settings that deliberately survive `setSource`, and the undo
    // stack that survives it for the same reason. The asymmetry is the difference between the two
    // actions: dropping a second sheet continues a workflow — the splitter hands back eight passes
    // at the same settings — while clearing is the user saying they are finished with this one. A
    // "Clear" that left a tolerance and a toggle behind would be a half-clear, and the next sheet
    // would arrive already keyed by a decision made about the last one. A stack left behind would be
    // stranger still: a way back to positions belonging to a sheet that is no longer here.
    clear: () => {
      set({ ...EMPTY });
      // `reset` rather than `forget`, and the pair below is why: the thread goes with the sheet — it
      // is holding the only other copy of the image, plus whatever a transform still running had
      // allocated — and `releaseSheet` also lets a *new* thread be built for the next sheet. So a
      // thread that had died is no longer a fact about this app, and the message saying it had must
      // go in the same breath, or the tab reports a quantiser that could not start while one is
      // running.
      useQuantiseAnswerStore.getState().reset();
      useAutoTuneStore.getState().forget();
      releaseSheet();
    },
  };
});
