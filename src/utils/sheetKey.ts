import { resolveBackgroundKey } from '../constants/backgroundKeysFor.ts';
import { BACKGROUND_KEY_COLORS } from '../constants/backgroundKeyColors.ts';
import type { Rgba } from '../types/quantiser.ts';
import type { TargetModelId } from '../types/output.ts';
import type { BackgroundKey } from '../types/rendering.ts';
import type { SheetSubject } from '../types/subject.ts';

/**
 * The key a sheet is drawn on and the colour it names, resolved together so the two can never name
 * different keys — the pair `SheetFacts` carries as `backgroundKey` and `keyColor`.
 *
 * The key is the stored one where the subject and the target can take it, and otherwise the first
 * they are offered (`resolveBackgroundKey`): a tint-masked icon set never compiles on `PURE_WHITE`
 * (audit finding M1), and a target that documents no alpha output never on `TRANSPARENT` (T1).
 */
export function sheetKey(
  subject: SheetSubject,
  target: TargetModelId,
  stored: BackgroundKey,
): { readonly backgroundKey: BackgroundKey; readonly keyColor: Rgba | null } {
  const backgroundKey = resolveBackgroundKey(subject, target, stored);
  return { backgroundKey, keyColor: BACKGROUND_KEY_COLORS[backgroundKey] };
}
