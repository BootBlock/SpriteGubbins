import type { CustomIconEntry } from '../types/iconRoster.ts';

/**
 * Whether two entries of the reader's own are the same entry, field by field — so an edit that changes
 * only the look is a change, and saving one unchanged is not. Read by `sameIconRoster`, and by the
 * catalogue dialog's shelves to tell a set's copy of an entry from a library copy that has moved on.
 */
export function sameCustomIcon(a: CustomIconEntry, b: CustomIconEntry): boolean {
  return (
    a.id === b.id &&
    a.role === b.role &&
    a.kind === b.kind &&
    a.school === b.school &&
    a.figure === b.figure &&
    a.look === b.look &&
    a.states?.[0] === b.states?.[0] &&
    a.states?.[1] === b.states?.[1]
  );
}
