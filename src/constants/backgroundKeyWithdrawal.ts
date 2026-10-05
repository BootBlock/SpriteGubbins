import { BACKGROUND_KEYS } from '../types/rendering.ts';
import type { SheetSubject } from '../types/subject.ts';
import { spokenList } from '../utils/spokenList.ts';
import { backgroundKeysFor } from './backgroundKeysFor.ts';

/**
 * What the Background Key control says once the subject has withdrawn a key from it, or `''` for a
 * subject that can take every key.
 *
 * Shown under the control, so it is plain text rather than card markup, and built from
 * `backgroundKeysFor`, the lookup the control's list is filtered by, so it cannot name a key that is
 * still offered or miss one that has gone. A tint mask is the one subject that withdraws one (audit
 * finding M1).
 */
export function backgroundKeyWithdrawal(subject: SheetSubject): string {
  const offered = backgroundKeysFor(subject);
  const withheld = BACKGROUND_KEYS.filter((key) => !offered.includes(key));
  if (withheld.length === 0) return '';
  return `This icon set is a tint mask, whose lightest greys the ${spokenList(withheld)} key would cut out, so ${withheld.length === 1 ? 'that key is' : 'those keys are'} not offered.`;
}
