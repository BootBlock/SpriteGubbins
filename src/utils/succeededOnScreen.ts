import type { PixelGrid } from '../types/quantiser.ts';

/**
 * The last transform that produced a sheet, where the Quantise tab is showing it — or `null`.
 *
 * Held against the *sheet* rather than the settings, which is what lets it outlive a settings change
 * and keep the preview up while the next one is computed — but only while there is a newer one coming.
 * With no scale in force there is nothing being computed and nothing to lag behind, so a result from
 * the scale the user has just deleted would be presented as settled: shown without the working chip,
 * offered to the Download button, and contradicting the panel above it, which is at that moment
 * asking for a grid.
 *
 * **A function of its own because two places ask it.** `useQuantiseWork` hands the tab its result,
 * and `useShownResult` hands the download what that result was computed at, from the stores, so no
 * component has to carry either down through the panel. A second spelling of the rule would be a
 * second answer to "is a result on screen", free to disagree with the pane the reader is looking at.
 *
 * Generic over what is shown, since the hook asks it of two primitives rather than of the result.
 * Pure, as everything in this directory is.
 */
export function succeededOnScreen<T>(
  hasSource: boolean,
  grid: PixelGrid | null,
  succeeded: T | null,
): T | null {
  return hasSource && grid !== null ? succeeded : null;
}
