import { BACKGROUND_KEYS } from '../types/rendering.ts';
import type { BackgroundKey } from '../types/rendering.ts';
import type { TargetModelId } from '../types/output.ts';
import type { SheetSubject } from '../types/subject.ts';
import { alphaDeliveryFor } from '../utils/targetCapabilities.ts';

/**
 * The background keys this subject can be drawn on by this target, in the order the control offers
 * them.
 *
 * **A tint mask withholds `PURE_WHITE`** (audit finding M1). A mask is drawn in neutral greys, and its
 * lightest grey is where the engine's team colour shows at full strength, so it runs close to white —
 * inside the white key's reach, which the Quantise tab removes wherever it sits. Asked of the subject
 * rather than the category, because the colour mode is the roster's and a full-colour icon set takes
 * the white key as readily as anything else does.
 *
 * **A target whose vendor documents no alpha output withholds `TRANSPARENT`** (audit finding T1). Asked
 * for alpha, such a target paints a checkerboard or a flat matte where the transparency should be, and
 * the Quantise tab has no key colour to remove. See `AlphaDelivery` for the four answers a target gives.
 */
export function backgroundKeysFor(subject: SheetSubject, target: TargetModelId): readonly BackgroundKey[] {
  const tintMask = subject.icons?.colourMode === 'TINT_MASK';
  const noAlpha = alphaDeliveryFor(target).kind === 'UNDOCUMENTED';
  return BACKGROUND_KEYS.filter(
    (key) => !(tintMask && key === 'PURE_WHITE') && !(noAlpha && key === 'TRANSPARENT'),
  );
}

/**
 * The key a configuration is drawn on: the stored one where the subject and the target can take it,
 * and otherwise the first key they are offered.
 *
 * Resolved where a stored key meets a subject or a target — the compiler (`sheetKey`), the studio's
 * digests, the Sheet panel's control, the store when a change of colour mode, of subject or of target
 * leaves a key behind (`outputForRoster`, `resolveOutputForSubject`, `TargetModelSelector`), and
 * every reader outside the compiler: the Quantise tab, its capture button and the custom icon form through
 * `useResolvedBackgroundKey`, and the identity palette capture out of the stores — as the canvas shape
 * is by `resolveAspectRatio`, so the prompt, the controls and the Quantise tab name one key.
 */
export function resolveBackgroundKey(
  subject: SheetSubject,
  target: TargetModelId,
  key: BackgroundKey,
): BackgroundKey {
  const offered = backgroundKeysFor(subject, target);
  const [fallback = key] = offered;
  return offered.includes(key) ? key : fallback;
}
