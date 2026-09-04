import { DOWNLOADS_RECORD_THE_STUDIO } from './guidanceSentences.ts';

/**
 * What the Quantise tab's identity panel says about the sheet a download is about to record.
 *
 * **Not a `*_TOOLTIPS` record, and still control guidance**, which is the pairing the walk in
 * `constants/tooltips/tooltips.test.ts` exists to keep apart from the filing. The panel holds no
 * value, so its paragraph sits under the figures rather than behind an ⓘ, and its two step buttons
 * carry the studio's own cards. But it reports no *reading*: it says what a download will record and
 * what those buttons do, and it says outright that it is not a reading of the reader's image. That is
 * the `ANTI_ALIAS_GUIDANCE` footing rather than the `QUANTISE_SCALE_GUIDANCE` one, so both entries are
 * named in that walk by hand — only the record shape is discoverable, and this is not that shape.
 *
 * The wording earns its length by saying the one thing the figure cannot: that this is the studio's
 * claim and not a reading of the image. Nothing here can check that the sheet on screen is the sheet
 * the studio is composing, and a reader who takes the line as a measurement will trust a manifest
 * that is confidently wrong. See `utils/sheetIdentity.ts`, which states the same boundary.
 */
export const SHEET_IDENTITY_GUIDANCE = {
  /** A batch of more than one sheet, where stepping is available and getting it wrong is possible. */
  batch:
    DOWNLOADS_RECORD_THE_STUDIO +
    ' It is a statement about the studio, not a reading of your image — nothing here can tell whether the sheet you dropped is the one named above, so if you have come back with a sheet from earlier in the batch, step the position to match it before you save. The two buttons move the studio itself, exactly as the batch strip on the Studio tab does: the prompt recompiles for the sheet you land on, nothing is copied, and nothing you have already taken away is disturbed.',

  /** A configuration that is one generation: nothing to step to, and nothing to get out of step. */
  single:
    DOWNLOADS_RECORD_THE_STUDIO +
    ' It is a statement about the studio, not a reading of your image — nothing here can tell whether the sheet you dropped is the one named above. This configuration is a single generation, so there is no position to keep in step; change the category or the direction set in the Studio tab and this line follows.',
} as const;
