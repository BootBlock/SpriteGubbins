import { DAMAGE_SCHOOLS } from '../types/iconCatalogue.ts';
import type { CustomIconFormValues } from '../types/customIconFormValues.ts';
import type { CustomIconEntry } from '../types/iconRoster.ts';
import { spokenIconState } from './spokenIconState.ts';

/**
 * The form's opening values: an entry's own, its states spoken as the reader would type them (`not
 * ready`, not `not-ready`), or a blank item for a new entry, with the first school ready for a spell.
 */
export function customIconFormValues(entry: CustomIconEntry | null): CustomIconFormValues {
  return {
    role: entry?.role ?? '',
    kind: entry?.kind ?? 'ITEM',
    school: entry?.school ?? DAMAGE_SCHOOLS[0],
    figure: entry?.figure === true,
    twoState: entry?.states !== undefined,
    firstState: entry?.states === undefined ? '' : spokenIconState(entry.states[0]),
    secondState: entry?.states === undefined ? '' : spokenIconState(entry.states[1]),
    look: entry?.look ?? '',
  };
}
