import type { CustomIconDraft } from '../types/customIconDraft.ts';
import type { CustomIconEntry } from '../types/iconRoster.ts';

/**
 * The draft that makes `entry` again, as the form would hand it over — what an entry already checked
 * is measured as when it moves: a library entry ticked onto a set, or a set's entry saved into the
 * library. `checkCustomIcon` makes the same entry from it, slot name included.
 */
export function customIconDraftOf(entry: CustomIconEntry): CustomIconDraft {
  return {
    role: entry.role,
    kind: entry.kind,
    school: entry.school ?? null,
    figure: entry.figure === true,
    states: entry.states ?? null,
    look: entry.look,
  };
}
