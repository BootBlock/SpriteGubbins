import type { Direction } from '../types/rendering.ts';

/**
 * What one sheet of a batch draws, in the half-dozen words anything pointing at it has room for.
 *
 * A sheet is named by two halves — what is on it (`plan.name`) and which way it is turned — and this
 * is the second half. It has to answer for both kinds of sheet a batch can hold: a `'run'` sheet
 * draws exactly one facing and is named by it, while a multi-view sheet draws several and would
 * otherwise be labelled with its assembly direction alone — reading identically to the single-facing
 * sheet beneath it and claiming the same coverage.
 *
 * Its own function because four places have to name a sheet and none of them may disagree: the
 * split drawer's rows, the studio's batch strip, the toast that says what was just copied, and the
 * Quantise tab's identity panel, which names the sheet a download is about to be recorded as. The
 * prompt's own series list in `describeSeries` deliberately does **not** use it — a sheet
 * reading that list needs to know *which* facings the others cover so it has a reason to leave them
 * alone, where a reader glancing at a row only needs to know this sheet is not one of the singles.
 *
 * **The two facing fields rather than a sheet**, because the fourth caller holds neither of the
 * shapes the first three do: a `ManifestSheet` spells the covered list `facings`, so a signature
 * naming a whole `BatchSheet` would have left that one caller restating the rule — the drift this
 * function exists to prevent, arriving through its own signature.
 */
export function sheetCoverage(covered: readonly Direction[], assembly: Direction): string {
  return covered.length > 1 ? `${String(covered.length)} facings` : assembly;
}
