import type { SheetSeries } from '../types/components.ts';

/**
 * How many sheets of a series place their pieces in cells (`SheetPlan.placement`): ICON's overlay
 * sheets, which close its series, and none on any other series.
 *
 * One answer for the two readers that tell an ICON series' icon sheets from its overlay sheets — the
 * roster summary (`iconRosterSummary`) and the sheet a roster change keeps the reader on
 * (`outputForRoster`) — because the overlay sheets are as many as the library and the *Extra Overlay
 * Pieces* fill, so "the last sheet" no longer names them.
 */
export function overlaySheetCount(series: SheetSeries): number {
  return series.filter((plan) => plan.placement !== undefined).length;
}
