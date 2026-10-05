import { resolveBackgroundKey } from '../constants/backgroundKeysFor.ts';
import { BACKGROUND_KEY_COLORS } from '../constants/backgroundKeyColors.ts';
import type { Rgba } from '../types/quantiser.ts';
import type { BackgroundKey } from '../types/rendering.ts';
import type { SheetSubject } from '../types/subject.ts';

/**
 * The key a sheet is drawn on and the colour it names, resolved together so the two can never name
 * different keys — the pair `SheetFacts` carries as `backgroundKey` and `keyColor`.
 *
 * The key is the stored one where the subject can take it, and otherwise the first the subject is
 * offered (`resolveBackgroundKey`): a tint-masked icon set never compiles on `PURE_WHITE` (audit
 * finding M1).
 */
export function sheetKey(
  subject: SheetSubject,
  stored: BackgroundKey,
): { readonly backgroundKey: BackgroundKey; readonly keyColor: Rgba | null } {
  const backgroundKey = resolveBackgroundKey(subject, stored);
  return { backgroundKey, keyColor: BACKGROUND_KEY_COLORS[backgroundKey] };
}
