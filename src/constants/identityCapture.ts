/**
 * Why the identity lock cannot read the sheet the Quantise tab is holding, in the reader's terms.
 *
 * Three states, and each one names the control that resolves it. A disabled button that says only
 * that it is unavailable is worse than no button, because the reader is left to guess which of the
 * two tabs is in the wrong state — and the answer is always the other one from the one they are
 * looking at.
 *
 * Filed here rather than in `constants/tooltips/`, which holds the guidance a control carries when
 * it *is* available. These are findings about the app's current state, in the shape `disabledReason`
 * takes everywhere else: a sentence appended to that guidance, not a replacement for it.
 */
export const IDENTITY_CAPTURE_UNAVAILABLE = {
  noSheet:
    'There is no sheet in the Quantise tab at the moment, so there is nothing here to read. Drop the sheet you accepted in there, or choose the file with the picker beside this button.',

  noResult:
    'The sheet in the Quantise tab has not been quantised yet. That tab needs a pixel scale in force before it produces a result, and this reads the result rather than the image you dropped.',

  keyStillOn:
    'The quantised sheet still has its background key painted on it, and the key is most of a sheet by area — so the palette would lead with it rather than with the subject. Turn on “Key the background to transparency” in the Quantise tab, then come back.',
} as const;
