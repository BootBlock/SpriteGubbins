import { DAMAGE_SCHOOLS, ICON_KINDS } from '../types/iconCatalogue.ts';
import type { CustomIconDraft } from '../types/customIconDraft.ts';
import type { CustomIconEntry } from '../types/iconRoster.ts';
import { checkCustomIcon } from '../utils/checkCustomIcon.ts';
import { isRecord } from './readers.ts';

/**
 * A stored entry of the reader's own, read wherever one is stored: on a roster's custom pick, in a
 * project's library row, and in a library pack.
 *
 * **Every field must be of the type it is declared as, or the entry is refused**, never repaired: a
 * role or a look is the reader's own words, and nothing could stand in for them. Each is against the
 * `as const` array that defines its union, so a kind or school added later is admitted by that edit.
 */
export function readCustomIconDraft(value: unknown): CustomIconDraft | null {
  if (!isRecord(value)) return null;
  const { role, look, kind, school, figure, states } = value;
  if (typeof role !== 'string' || typeof look !== 'string') return null;
  const knownKind = ICON_KINDS.find((each) => each === kind);
  if (knownKind === undefined) return null;
  const knownSchool = school === undefined ? null : (DAMAGE_SCHOOLS.find((each) => each === school) ?? null);
  if (school !== undefined && knownSchool === null) return null;
  if (figure !== undefined && figure !== true) return null;
  const pair = states === undefined ? null : readStates(states);
  if (states !== undefined && pair === null) return null;
  return { role, look, kind: knownKind, school: knownSchool, figure: figure === true, states: pair };
}

function readStates(value: unknown): readonly [string, string] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [first, second]: unknown[] = value;
  return typeof first === 'string' && typeof second === 'string' ? [first, second] : null;
}

/**
 * A stored library entry, on its own: its fields read by {@link readCustomIconDraft} and then held to
 * `checkCustomIcon` with no roster and no library beside it, so a bracket, a count, a dash or a slot
 * the catalogue or the overlay sheet answers to is refused here as the form would refuse it. The slot
 * name is derived again from the role rather than trusted from storage.
 *
 * Whether two entries of one project share a slot is a question about the collection, which
 * `firstOfEachSlot` answers once every entry has been read.
 */
export function parseCustomIconEntry(value: unknown): CustomIconEntry | null {
  const draft = readCustomIconDraft(value);
  return draft === null ? null : checkCustomIcon(draft, [], null, []).entry;
}
