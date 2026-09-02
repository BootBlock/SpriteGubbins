import { useMemo } from 'react';
import { useQuantiseStore } from '../stores/useQuantiseStore.ts';
import type { QuantiseTuning } from '../types/quantiser.ts';

/**
 * Every dial the pipeline is tuned by, as one object whose identity only changes when a dial does.
 *
 * A hook rather than a block inside `QuantiseTab` because it is a different responsibility from the
 * tab's layout, and it was two-thirds of the file: twenty-three subscriptions, the object they build
 * and the dependency array that decides when to rebuild it, with the same twenty-three names written
 * out three times.
 *
 * **One call site, deliberately.** CLAUDE.md sends a shared hook here and warns against a hook that
 * wraps a single `useState`; this is neither. It needs React and the store, so `src/utils/` is closed
 * to it, and it is not a component. The rule's target is an abstraction that hides nothing — this
 * hides the whole of the tab's store surface.
 *
 * **Atomic selectors, not one subscription over the store.** A component reading the store wholesale
 * re-renders on every unrelated field, and this store also holds the sheet, the grid and a held
 * palette — three things that change without a dial moving. Each field is subscribed to on its own,
 * and `useMemo` is what turns twenty-three of them back into one stable object.
 *
 * **The memo is load-bearing rather than an optimisation.** `useQuantiseWork` keys its debounce on
 * this object's identity, so a fresh object each render would restart the timer each render and the
 * transform would never be asked for.
 */
export function useQuantiseTuning(): QuantiseTuning {
  const silhouetteThreshold = useQuantiseStore((state) => state.silhouetteThreshold);
  const vote = useQuantiseStore((state) => state.vote);
  const outlineExpansion = useQuantiseStore((state) => state.outlineExpansion);
  const lineStrength = useQuantiseStore((state) => state.lineStrength);
  const trimStrength = useQuantiseStore((state) => state.trimStrength);
  const inkThreshold = useQuantiseStore((state) => state.inkThreshold);
  const colorMerge = useQuantiseStore((state) => state.colorMerge);
  const fillCleanup = useQuantiseStore((state) => state.fillCleanup);
  const cleanupPasses = useQuantiseStore((state) => state.cleanupPasses);
  const spriteGap = useQuantiseStore((state) => state.spriteGap);
  const symmetry = useQuantiseStore((state) => state.symmetry);
  const symmetryTolerance = useQuantiseStore((state) => state.symmetryTolerance);
  const symmetryConfidence = useQuantiseStore((state) => state.symmetryConfidence);
  const duplicateTolerance = useQuantiseStore((state) => state.duplicateTolerance);
  const duplicateSnap = useQuantiseStore((state) => state.duplicateSnap);
  const frameAlignment = useQuantiseStore((state) => state.frameAlignment);
  const frameDriftTolerance = useQuantiseStore((state) => state.frameDriftTolerance);
  const antiAlias = useQuantiseStore((state) => state.antiAlias);
  const antiAliasThreshold = useQuantiseStore((state) => state.antiAliasThreshold);
  const antiAliasStrength = useQuantiseStore((state) => state.antiAliasStrength);
  const antiAliasRun = useQuantiseStore((state) => state.antiAliasRun);
  const antiAliasPalette = useQuantiseStore((state) => state.antiAliasPalette);
  const dither = useQuantiseStore((state) => state.dither);

  // One memoised object, because the hook keys its debounce on the tuning's identity — atomic
  // selectors above, so an unrelated store change does not rebuild it.
  return useMemo(
    () => ({
      silhouetteThreshold,
      vote,
      outlineExpansion,
      lineStrength,
      trimStrength,
      inkThreshold,
      colorMerge,
      fillCleanup,
      cleanupPasses,
      dither,
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
    }),
    [
      silhouetteThreshold,
      vote,
      outlineExpansion,
      lineStrength,
      trimStrength,
      inkThreshold,
      colorMerge,
      fillCleanup,
      cleanupPasses,
      dither,
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
    ],
  );
}
