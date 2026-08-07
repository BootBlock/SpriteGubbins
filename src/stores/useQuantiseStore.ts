import { create } from 'zustand';
import type { ImportedImage, PixelGrid } from '../types/quantiser.ts';

/**
 * The sheet being quantised, and the scale the user chose for it.
 *
 * A store rather than the tab's own `useState`, because **the workflow crosses tabs**. The colour
 * budget and the target component size are studio settings by design — the quantiser reads them
 * rather than offering a second copy — so going to the studio to change one and coming back is the
 * ordinary case, not an edge. `App` swaps the whole view on navigation, which unmounts the tab, and
 * local state would drop the image on every one of those trips.
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

  setSource(source: ImportedImage): void;
  setGridOverride(gridOverride: PixelGrid | null): void;
}

export const useQuantiseStore = create<QuantiseState>((set) => ({
  source: null,
  gridOverride: null,

  // Clearing the override is part of taking a new image, not a separate step a caller can forget: a
  // grid chosen for the last sheet says nothing about this one, and carrying it over would show a
  // confident result at a scale nobody claimed applied.
  setSource: (source) => {
    set({ source, gridOverride: null });
  },

  setGridOverride: (gridOverride) => {
    set({ gridOverride });
  },
}));
