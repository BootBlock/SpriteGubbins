import type { BackgroundKeying, Rgba } from '../types/quantiser.ts';

/**
 * What the keying pass is being asked to remove, or `null` for the two ways it does not run at all.
 *
 * `null` on either count — the reader has not asked, or the studio's key names no colour to match —
 * and the pipeline skips the pass entirely rather than keying against a default nobody chose. The
 * two causes are deliberately not told apart here: `quantiseImage` does the same thing for both, and
 * the panel that *does* need to tell them apart reads the studio's key itself.
 *
 * **A function of its own because two places need the same answer.** `QuantiseTab` builds it for the
 * pipeline, and `quantisedSheetCapture` has to decide whether the result the studio is being offered
 * was computed against the key in force now — a comparison that means nothing if the two sides
 * construct the value differently.
 */
export function keyingInForce(
  keyingEnabled: boolean,
  keyColor: Rgba | null,
  keyTolerance: number,
): BackgroundKeying | null {
  return !keyingEnabled || keyColor === null ? null : { color: keyColor, tolerance: keyTolerance };
}
