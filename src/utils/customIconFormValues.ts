import { CUSTOM_ICON_FAMILY_SIZE } from '../constants/iconCatalogue/customIconLimits.ts';
import type { CustomIconVariantDraft } from '../types/customIconDraft.ts';
import { DAMAGE_SCHOOLS } from '../types/iconCatalogue.ts';
import type { CustomIconFormValues } from '../types/customIconFormValues.ts';
import type { CustomIconEntry } from '../types/iconRoster.ts';
import { spokenIconState } from './spokenIconState.ts';

/** The members a form opens with when the entry has none: the fewest a family takes, each blank. */
const BLANK_FAMILY: readonly CustomIconVariantDraft[] = Array.from(
  { length: CUSTOM_ICON_FAMILY_SIZE.fewest },
  () => ({ name: '', look: '' }),
);

/**
 * The form's opening values: an entry's own, its states and its members' names spoken as the reader
 * would type them (`not ready`, not `not-ready`), or a blank item for a new entry, with the first school
 * ready for a spell and a blank family ready for a reader who switches to one.
 */
export function customIconFormValues(entry: CustomIconEntry | null): CustomIconFormValues {
  return {
    role: entry?.role ?? '',
    kind: entry?.kind ?? 'ITEM',
    school: entry?.school ?? DAMAGE_SCHOOLS[0],
    figure: entry?.figure === true,
    shape: entry?.variants !== undefined ? 'VARIANTS' : entry?.states !== undefined ? 'STATES' : 'ONE',
    firstState: entry?.states === undefined ? '' : spokenIconState(entry.states[0]),
    secondState: entry?.states === undefined ? '' : spokenIconState(entry.states[1]),
    variants:
      entry?.variants?.map((variant) => ({
        name: spokenIconState(variant.name),
        look: variant.look ?? '',
      })) ?? BLANK_FAMILY,
    look: entry?.look ?? '',
  };
}
