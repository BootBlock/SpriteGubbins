import { BACKGROUND_KEYS } from '../types/rendering.ts';
import type { BackgroundKey } from '../types/rendering.ts';
import type { SheetSubject } from '../types/subject.ts';

/**
 * The background keys this subject can be drawn on, in the order the control offers them.
 *
 * **A tint mask withholds `PURE_WHITE`** (audit finding M1). A mask is drawn in neutral greys, and its
 * lightest grey is where the engine's team colour shows at full strength, so it runs close to white —
 * inside the white key's reach, which the Quantise tab removes wherever it sits. Every other subject
 * can take every key. Asked of the subject rather than the category, because the colour mode is the
 * roster's and a full-colour icon set takes the white key as readily as anything else does.
 */
export function backgroundKeysFor(subject: SheetSubject): readonly BackgroundKey[] {
  if (subject.icons?.colourMode !== 'TINT_MASK') return BACKGROUND_KEYS;
  return BACKGROUND_KEYS.filter((key) => key !== 'PURE_WHITE');
}

/**
 * The key a configuration is drawn on: the stored one where the subject can take it, and otherwise the
 * first key the subject is offered.
 *
 * Resolved where a stored key meets a subject — the compiler, the Sheet panel's control, and the store
 * when a change of colour mode or of subject leaves a key behind (`resolveOutputForSubject`) — as the
 * canvas shape is by `resolveAspectRatio`, so the prompt, the control and the Quantise tab name one key.
 */
export function resolveBackgroundKey(subject: SheetSubject, key: BackgroundKey): BackgroundKey {
  const offered = backgroundKeysFor(subject);
  const [fallback = key] = offered;
  return offered.includes(key) ? key : fallback;
}
