import { KEY_TOLERANCES } from './quantiser.ts';

/**
 * Why the identity lock cannot read the sheet the Quantise tab is holding, in the reader's terms.
 *
 * Five states, and each one names the control that resolves it. A disabled button that says only
 * that it is unavailable is worse than no button, because the reader is left to guess which of the
 * two tabs is in the wrong state — and the answer is always the other one from the one they are
 * looking at.
 *
 * Filed here rather than in `constants/tooltips/`, which holds the guidance a control carries when
 * it *is* available. These are findings about the app's current state, in the shape `disabledReason`
 * takes everywhere else: a sentence appended to that guidance, not a replacement for it. They are
 * still a control's own explanation, so `constants/tooltips/tooltips.test.ts` names them in its walk
 * — the standing `TARGET_MODELS[].generatorSite.note` case, which is the same disabled button
 * carrying the same shape of reason.
 */
export const IDENTITY_CAPTURE_UNAVAILABLE = {
  noSheet:
    'There is no sheet in the Quantise tab at the moment, so there is nothing here to read. Drop the sheet you accepted in there, or choose the file with the picker beside this button.',

  noResult:
    'The Quantise tab is not showing a result for its sheet. That tab needs a pixel scale in force before it produces one, and this reads the result rather than the image you dropped.',

  failed:
    'The last attempt to quantise that sheet failed, so there is no result to read. The Quantise tab says what went wrong, and a smaller pixel scale is the usual answer.',

  stale:
    'The Quantise tab’s result was computed before you changed the background key or the colour settings, so its colours are no longer the ones this configuration asks for. Open that tab to let it recompute, then come back.',

  keyStillOn:
    'The quantised sheet still has its background key painted on it, and the key is most of a sheet by area — so the palette would lead with it rather than with the subject. In the Quantise tab, turn on “Key the background to transparency”, or raise the tolerance beside it if it is already on.',
} as const;

/**
 * How far off the studio's key a colour may sit and still be counted as the key field, when asking
 * whether a quantised result still carries one.
 *
 * **The widest rung the keying control itself offers**, and deliberately not the rung the reader has
 * that control set to. The two are asking opposite questions: their dial decides what to *remove*,
 * where a generous setting risks eating the artwork, while this decides whether anything key-shaped
 * *survived*, where a mean setting risks saying no when the answer is yes. At the ladder's `0` rung
 * keying removes only the exact key, which on a resampled sheet is almost nothing — so a reading
 * taken at the reader's own tolerance would report a clean sheet and the lock would be written with
 * the field leading it.
 *
 * Measured over all eight sheets in `test_sprites/`, quantised at a grid of 4 and 32 colours, the
 * separation is total: the border share is **1.000** with keying off and **1.000** with keying on at
 * the `0` rung, against **0.000** with keying on at `DEFAULT_KEY_TOLERANCE`. There is no threshold
 * question between those two figures, which is why `KEY_OFFER_BORDER_SHARE` is reused rather
 * than a second one being fitted.
 */
export const IDENTITY_KEY_SURVIVAL_TOLERANCE = Math.max(...KEY_TOLERANCES);
