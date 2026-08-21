import { create } from 'zustand';
import {
  DEFAULT_CLEANUP_PASSES,
  DEFAULT_COLOR_MERGE,
  DEFAULT_DITHER,
  DEFAULT_FILL_CLEANUP,
  DEFAULT_KEY_TOLERANCE,
  DEFAULT_INK_THRESHOLD,
  DEFAULT_LINE_STRENGTH,
  DEFAULT_OUTLINE_EXPANSION,
  DEFAULT_PALETTE_SNAP,
  DEFAULT_TRIM_STRENGTH,
} from '../constants/quantiser.ts';
import type {
  DitherPattern,
  ImportedImage,
  LockedPalette,
  PixelGrid,
  VoteMethod,
} from '../types/quantiser.ts';
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
  /** How far a pixel may sit from the key colour, as `keyDistanceSquared` measures that. */
  readonly keyTolerance: number;
  /**
   * Which cell reading turns the mesh into pixels — see `VoteMethod`.
   *
   * Like the keying settings, this survives `setSource` and falls only to `clear`: which reading
   * suits a sheet is a judgement about the *artwork's style* — contour-heavy, painterly, flat —
   * and the splitter hands back eight sheets in one style, not eight styles.
   */
  readonly vote: VoteMethod;
  /**
   * How far the outline-expansion pre-pass grows the local detail, from `OUTLINE_EXPANSION_RANGE`
   * — `0` is off.
   *
   * Workflow intent like the vote it runs ahead of: how heavily a sheet's contours need rescuing is
   * a fact about the artwork's style, and the splitter hands back eight sheets in one style.
   */
  readonly outlineExpansion: number;
  /** The ink-weighted reading's pull, from `LINE_STRENGTH_RANGE` — workflow intent, like the vote. */
  readonly lineStrength: number;
  /** The bright mirror of the line strength, from TRIM_STRENGTH_RANGE — 0 is off. */
  readonly trimStrength: number;
  /** The ink-weighted reading's ink ceiling, from INK_THRESHOLD_RANGE. */
  readonly inkThreshold: number;
  /** The fill cleanup's merge tolerance, from `FILL_CLEANUP_RANGE` — `0` is off. */
  readonly fillCleanup: number;
  /** The colour merge's sheet-wide fold tolerance, from `COLOR_MERGE_RANGE` — `0` is off. */
  readonly colorMerge: number;
  /** How many settling passes the fill cleanup runs, from CLEANUP_PASSES_RANGE. */
  readonly cleanupPasses: number;
  /**
   * Which positional pattern the palette step dithers through — `NONE` is off.
   *
   * Workflow intent like the vote and the expansion, and for the same reason: a dither is a
   * decision about how a *series* should look, and the splitter hands back eight sheets in one
   * style. Read only where the studio or a lock names a palette to dither against.
   */
  readonly dither: DitherPattern;
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
   * How near a locked colour a colour must sit to be taken to it, from `PALETTE_SNAP_RANGE`.
   *
   * `0` is the pass not running, as every other dial's zero is: the lock reaches nothing. Read only
   * while a palette is locked.
   */
  readonly paletteSnap: number;

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
  /** Put the tab back where it opened: no sheet, and every control at its default. */
  clear(): void;
}

/** What the tab opens with, and what `clear` puts back. */
const EMPTY: Pick<
  QuantiseState,
  | 'source'
  | 'gridOverride'
  | 'keyingEnabled'
  | 'keyTolerance'
  | 'vote'
  | 'outlineExpansion'
  | 'lineStrength'
  | 'fillCleanup'
  | 'colorMerge'
  | 'trimStrength'
  | 'inkThreshold'
  | 'cleanupPasses'
  | 'dither'
  | 'lockedPalette'
  | 'paletteSnap'
> = {
  source: null,
  gridOverride: null,
  keyingEnabled: false,
  keyTolerance: DEFAULT_KEY_TOLERANCE,
  vote: 'DOMINANT',
  outlineExpansion: DEFAULT_OUTLINE_EXPANSION,
  lineStrength: DEFAULT_LINE_STRENGTH,
  trimStrength: DEFAULT_TRIM_STRENGTH,
  inkThreshold: DEFAULT_INK_THRESHOLD,
  fillCleanup: DEFAULT_FILL_CLEANUP,
  colorMerge: DEFAULT_COLOR_MERGE,
  cleanupPasses: DEFAULT_CLEANUP_PASSES,
  dither: DEFAULT_DITHER,
  lockedPalette: null,
  paletteSnap: DEFAULT_PALETTE_SNAP,
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
  //
  // **The locked palette survives for a stronger reason still**: carrying it to the next sheet is
  // not a convenience but the entire feature. A lock that fell here would only ever be applied to
  // the sheet it was taken from, where it does nothing.
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

  setVote: (vote) => {
    set({ vote });
  },

  setDither: (dither) => {
    set({ dither });
  },

  setOutlineExpansion: (outlineExpansion) => {
    set({ outlineExpansion });
  },

  setLineStrength: (lineStrength) => {
    set({ lineStrength });
  },

  setTrimStrength: (trimStrength) => {
    set({ trimStrength });
  },

  setInkThreshold: (inkThreshold) => {
    set({ inkThreshold });
  },

  setFillCleanup: (fillCleanup) => {
    set({ fillCleanup });
  },

  setColorMerge: (colorMerge) => {
    set({ colorMerge });
  },

  setCleanupPasses: (cleanupPasses) => {
    set({ cleanupPasses });
  },

  lockPalette: (lockedPalette) => {
    set({ lockedPalette });
  },

  unlockPalette: () => {
    set({ lockedPalette: null });
  },

  setPaletteSnap: (paletteSnap) => {
    set({ paletteSnap });
  },

  // Everything, including the keying settings that deliberately survive `setSource`. The asymmetry is
  // the difference between the two actions: dropping a second sheet continues a workflow — the
  // splitter hands back eight passes at the same settings — while clearing is the user saying they
  // are finished with this one. A "Clear" that left a tolerance and a toggle behind would be a
  // half-clear, and the next sheet would arrive already keyed by a decision made about the last one.
  clear: () => {
    set({ ...EMPTY });
    // `reset` rather than `forget`, and the pair below is why: the thread goes with the sheet — it is
    // holding the only other copy of the image, plus whatever a transform still running had
    // allocated — and `releaseSheet` also lets a *new* thread be built for the next sheet. So a
    // thread that had died is no longer a fact about this app, and the message saying it had must go
    // in the same breath, or the tab reports a quantiser that could not start while one is running.
    useQuantiseAnswerStore.getState().reset();
    releaseSheet();
  },
}));
