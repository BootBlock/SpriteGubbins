import type { PixelGrid, SheetFacts } from '../types/quantiser.ts';

/**
 * The pixel scale the Quantise tab is actually working at: the reader's own answer, or an `EXACT`
 * reading of the sheet behind it, or nothing.
 *
 * **An estimated scale is deliberately not adopted.** Each of the three readings that can produce
 * one carries a tolerance the exact reading does not, so a scale nobody chose and nobody was asked
 * to check would reduce the sheet by a factor the panel above is at that moment describing as an
 * estimate. `GridControls` offers it to click instead, which is the same standing the tab gives the
 * studio's target size: a candidate, never a default.
 *
 * **A function of its own because two places need the same answer.** `useQuantiseWork` resolves the
 * scale the tab computes at, and `quantisedSheetCapture` has to know whether the tab is showing a
 * result at all before offering it to the studio — and a second spelling of the rule is a second
 * answer to "is there a scale in force", free to disagree with the tab the reader just left.
 */
export function gridInForce(gridOverride: PixelGrid | null, facts: SheetFacts | null): PixelGrid | null {
  return gridOverride ?? (facts?.scale?.measurement === 'EXACT' ? facts.scale.grid : null);
}
