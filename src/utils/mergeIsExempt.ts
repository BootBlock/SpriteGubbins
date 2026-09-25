import type { ColorReduction, QuantiseSettings } from '../types/quantiser.ts';

/**
 * Whether the reduction's colours were *stated* rather than chosen from this sheet.
 *
 * The two that were — a palette pinned in the studio and a palette locked off an earlier result —
 * are the two the sheet-wide colour merge may not touch, for the reason given below. The other two
 * chose their colours from this image, so folding two of them together takes nothing back from
 * anybody.
 */
function statedPalette(reduction: ColorReduction | null): boolean {
  return reduction?.kind === 'PALETTE' || reduction?.kind === 'LOCKED';
}

/**
 * Whether the sheet-wide colour merge is held back — asked of the two settings that decide it, so a
 * caller that is not the pipeline can ask it too.
 *
 * **The merge does not run at all where the reader has *stated* which colours the sheet is made
 * of**, a pinned palette or one locked off an earlier sheet: those entries are an explicit statement
 * that two colours are distinct, and a cleanup dial must not quietly un-pin a pair of them. The
 * whole pass is held back rather than the entries alone, so a colour the palette step left further
 * than the snap from every entry is not folded either. The exemption lifts under a dither, because
 * there the palette step has not run yet and no pixel is a palette entry, so there is nothing of the
 * reader's for a fold to edit.
 *
 * Its own module, away from `quantiseImage`, because three callers ask it and one of them is on the
 * main thread: the pipeline, which skips the pass; `TUNE_CELL_STAGES`, which would otherwise sweep
 * fifteen candidates a round over one image and report a dial moved that reached nothing; and
 * `DownscaleControls`, which withdraws the Colour merge slider for the same reason. Importing the
 * pipeline into a panel would put the whole of it in the main bundle, and a second copy of the
 * condition would be a second opinion about when the pass runs.
 *
 * The dither is tested as `NONE` rather than through `ditherMatrix`, which builds and caches the
 * pattern's tile — work a panel asking a yes-or-no question has no reason to do. The two agree:
 * `ditherMatrix` is `null` for `NONE` and for nothing else. They part company from the pipeline's
 * own `positional` local only where a dither is set with no reduction in force, and there
 * `statedPalette` is false anyway.
 */
export function mergeIsExempt(settings: Pick<QuantiseSettings, 'dither' | 'reduction'>): boolean {
  return settings.dither === 'NONE' && statedPalette(settings.reduction);
}
