import type { BatchSheet } from './sheetBatch.ts';

/**
 * What one sheet of a batch draws, in the half-dozen words anything pointing at it has room for.
 *
 * A sheet is named by two halves — what is on it (`plan.name`) and which way it is turned — and this
 * is the second half. It has to answer for both kinds of sheet a batch can hold: a `'run'` sheet
 * draws exactly one facing and is named by it, while a multi-view sheet draws several and would
 * otherwise be labelled with its assembly direction alone — reading identically to the single-facing
 * sheet beneath it and claiming the same coverage.
 *
 * Its own function because three places have to name a sheet and none of them may disagree: the
 * split drawer's rows, the studio's batch strip, and the toast that says what was just copied. The
 * prompt's own series list in `describeSeries` deliberately does **not** use it — a sheet
 * reading that list needs to know *which* facings the others cover so it has a reason to leave them
 * alone, where a reader glancing at a row only needs to know this sheet is not one of the singles.
 */
export function sheetCoverage(sheet: BatchSheet): string {
  return sheet.covered.length > 1 ? `${String(sheet.covered.length)} facings` : sheet.assembly;
}
