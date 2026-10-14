import type { CustomIconEntry } from '../types/iconRoster.ts';
import type { SavedCustomIcon } from '../types/savedCustomIcon.ts';
import { checkCustomIcon } from './checkCustomIcon.ts';
import { customIconDraftOf } from './customIconDraftOf.ts';

/**
 * Each project's library with no two entries answering to one slot name, keeping the first.
 *
 * **The store refuses the clash, so only storage edited by hand or a pack can hold one.** A library
 * holding two entries that cut to one file would offer two rows a set cannot both tick, and an edit
 * aimed at one would land on whichever the store found first. Measured by `checkCustomIcon` against
 * the entries already kept in the same project, so a pair's drawing names (`<id>-<state>`) clash
 * exactly as the form would say they do, and one project's slots never constrain another's.
 *
 * **First wins**, as `firstOfEachId` decides for a repeated id: a pack is read top to bottom, and a
 * stored collection comes back in the order the backend lists it, newest first.
 */
export function firstOfEachSlot(icons: readonly SavedCustomIcon[]): SavedCustomIcon[] {
  const kept = new Map<string, CustomIconEntry[]>();
  return icons.filter((icon) => {
    const library = kept.get(icon.projectId) ?? [];
    if (checkCustomIcon(customIconDraftOf(icon.entry), [], null, library).entry === null) return false;
    kept.set(icon.projectId, [...library, icon.entry]);
    return true;
  });
}
