import type { QuantiseDials } from '../types/quantisePreset.ts';
import { useQuantiseStore } from './useQuantiseStore.ts';

/**
 * Every dial on the Quantise tab, as it stands right now, in the shape a preset stores.
 *
 * **Reads the store rather than taking an argument**, which is what makes "save these settings"
 * mean the settings on screen and not a copy the panel was holding when it last rendered. The tab's
 * dials move under a debounce, and a preset saved from a stale prop would record a position the
 * reader had already moved past.
 *
 * **Named field by field rather than spread off the store, and that is the point:** the store also
 * holds a sheet, a grid and possibly a locked palette, and a spread would carry all three into
 * storage. The compiler checks the set — a dial added to {@link QuantiseDials}, or to the
 * pipeline's `QuantiseTuning` that it extends, fails here until it is listed.
 *
 * Deliberately **not** the memoised `tuning` object `QuantiseTab` builds. That one is a different
 * set — the pipeline's own, without the keying, palette-snap and locked-palette dials a preset
 * carries — and it is assembled from atomic selectors under a dependency array, because its
 * identity is what the worker keys its debounce on. Two shapes, two reasons, and folding them
 * together would give the tab a dependency on fields it never reads.
 */
export function currentQuantiseDials(): QuantiseDials {
  const {
    keyingEnabled,
    keyTolerance,
    silhouetteThreshold,
    vote,
    outlineExpansion,
    lineStrength,
    trimStrength,
    inkThreshold,
    fillCleanup,
    colorMerge,
    cleanupPasses,
    dither,
    paletteSnap,
    spriteGap,
    symmetry,
    symmetryTolerance,
    symmetryConfidence,
    duplicateTolerance,
    duplicateSnap,
    frameAlignment,
    frameDriftTolerance,
    antiAlias,
    antiAliasThreshold,
    antiAliasStrength,
    antiAliasRun,
    antiAliasPalette,
  } = useQuantiseStore.getState();

  return {
    keyingEnabled,
    keyTolerance,
    silhouetteThreshold,
    vote,
    outlineExpansion,
    lineStrength,
    trimStrength,
    inkThreshold,
    fillCleanup,
    colorMerge,
    cleanupPasses,
    dither,
    paletteSnap,
    spriteGap,
    symmetry,
    symmetryTolerance,
    symmetryConfidence,
    duplicateTolerance,
    duplicateSnap,
    frameAlignment,
    frameDriftTolerance,
    antiAlias,
    antiAliasThreshold,
    antiAliasStrength,
    antiAliasRun,
    antiAliasPalette,
  };
}
