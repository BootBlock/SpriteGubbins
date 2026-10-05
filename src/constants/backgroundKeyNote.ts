import type { BackgroundKey } from '../types/rendering.ts';
import type { TargetModelId } from '../types/output.ts';
import type { SheetSubject } from '../types/subject.ts';
import { alphaDeliveryFor } from '../utils/targetCapabilities.ts';
import { backgroundKeysFor } from './backgroundKeysFor.ts';

/**
 * What the Background Key control says under itself, or `''` where it has nothing to add: why a key is
 * missing from its list, and what a target needs before it returns the transparency the key asks for.
 *
 * Shown under the control, so it is plain text rather than card markup. The withdrawals are read off
 * `backgroundKeysFor`, the lookup the control's list is filtered by, so a sentence cannot name a key
 * that is still offered or miss one that has gone. A tint mask withdraws `PURE_WHITE` (audit finding
 * M1) and a target that documents no alpha output withdraws `TRANSPARENT`; a target that returns alpha
 * only when the reader's own request asks for it states that request while `key` is `TRANSPARENT`
 * (audit finding T1).
 */
export function backgroundKeyNote(subject: SheetSubject, target: TargetModelId, key: BackgroundKey): string {
  const offered = backgroundKeysFor(subject, target);
  const withheld = (candidate: BackgroundKey) => !offered.includes(candidate);
  const alpha = alphaDeliveryFor(target);
  const sentences = [
    withheld('PURE_WHITE') &&
      'This icon set is a tint mask, whose lightest greys the PURE_WHITE key would cut out, so that key is not offered.',
    withheld('TRANSPARENT') &&
      'This target model documents no transparent output for a prompt, so TRANSPARENT is not offered.',
    alpha.kind === 'REQUEST_PARAMETER' && key === 'TRANSPARENT' && alpha.note,
  ];
  return sentences.filter((sentence) => sentence !== false).join(' ');
}
