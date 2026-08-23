/**
 * What the Quantise tab's identity panel says about the sheet a download is about to record.
 *
 * **Not a control's guidance**, so it is not a `*_TOOLTIPS` record and the walk in
 * `constants/tooltips/tooltips.test.ts` does not collect it: the panel has no value to explain and
 * its two buttons carry the studio's own cards. This is the paragraph under the figures, in the same
 * position `QUANTISE_SCALE_GUIDANCE` holds in the panel above — copy about the state of the reader's
 * own work rather than about a control.
 *
 * The wording earns its length by saying the one thing the figure cannot: that this is the studio's
 * claim and not a reading of the image. Nothing here can check that the sheet on screen is the sheet
 * the studio is composing, and a reader who takes the line as a measurement will trust a manifest
 * that is confidently wrong. See `utils/sheetIdentity.ts`, which states the same boundary.
 */
export const SHEET_IDENTITY_GUIDANCE = {
  /** A batch of more than one sheet, where stepping is available and getting it wrong is possible. */
  batch:
    'Every download from this tab records the studio’s configuration beside the artwork, and this is what it will record. It is a statement about the studio, not a reading of your image — nothing here can tell whether the sheet you dropped is the one named above, so if you have come back with a sheet from earlier in the batch, step the position to match it before you save. The two buttons move the studio itself, exactly as the batch strip on the Studio tab does, and neither of them copies or changes a prompt.',

  /** A configuration that is one generation: nothing to step to, and nothing to get out of step. */
  single:
    'Every download from this tab records the studio’s configuration beside the artwork, and this is what it will record. It is a statement about the studio, not a reading of your image — nothing here can tell whether the sheet you dropped is the one named above. This configuration is a single generation, so there is no position to keep in step; change the category or the direction set in the Studio tab and this line follows.',
} as const;
