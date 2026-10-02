import { iconCatalogueEntry, iconComponentCount } from '../constants/iconCatalogue/index.ts';
import { ICON_ROSTER_CAPACITY } from '../constants/iconCatalogue/iconSheetLimits.ts';
import { DAMAGE_SCHOOLS, ICON_KINDS } from '../types/iconCatalogue.ts';
import type { CustomIconDraft } from '../types/customIconDraft.ts';
import { ICON_LOOKS } from '../types/iconRoster.ts';
import type { IconPick, IconRoster } from '../types/iconRoster.ts';
import { checkCustomIcon } from '../utils/checkCustomIcon.ts';
import { iconPickId } from '../utils/iconPickId.ts';
import { isRecord, pick } from './readers.ts';

/**
 * A stored icon roster, read back against the catalogue this build ships.
 *
 * **Tolerant field by field, as `parseSubject` is.** A roster that is not a record, or whose picks are
 * not a list, has been damaged or edited by hand, and the category's starter roster (`fallback`) stands
 * in for that part. A look this build does not draw falls back to the starter's.
 *
 * **A pick that does not parse is dropped**, which is what the project's no-compatibility rule asks of a
 * retired identifier or shape: it is not translated, and the set loses that one icon rather than gaining
 * a blank slot. That covers a catalogue id this build does not hold, a pick written before picks were
 * tagged (a bare id string), and an entry of the reader's own that `checkCustomIcon` refuses — so a
 * hand-edited entry carrying `[SEC:…]` never reaches the compiler, whose citations it would break. A
 * custom entry's slot name is derived again from its role rather than trusted from storage.
 *
 * Repeats keep their first position, and the list stops at the last pick that fits in
 * `ICON_ROSTER_CAPACITY` components, so no stored roster can ask for a series past the bound
 * `SHEET_INDEX_RANGE` is derived from. The stored order is kept: the store writes every roster in
 * shelving order (`sortIconPicks`), so a roster read back is the one written.
 */
export function parseIconRoster(value: unknown, fallback: IconRoster): IconRoster {
  if (!isRecord(value)) return fallback;
  const look = pick(value, 'look', fallback.look, ICON_LOOKS);
  const stored = value['picks'];
  if (!Array.isArray(stored)) return { look, picks: fallback.picks };

  const picks: IconPick[] = [];
  let filled = 0;
  for (const item of stored) {
    const read = readPick(item);
    if (read === null) continue;
    if (filled + read.count > ICON_ROSTER_CAPACITY) break;
    const parsed = read.source === 'CATALOGUE' ? read.pick : customPick(read.draft, picks);
    if (parsed === null || picks.some((held) => iconPickId(held) === iconPickId(parsed))) continue;
    picks.push(parsed);
    filled += read.count;
  }
  return { look, picks };
}

/** A stored pick read as far as its shape, before the roster it joins is consulted. */
type ReadPick = { readonly count: number } & (
  | { readonly source: 'CATALOGUE'; readonly pick: IconPick }
  | { readonly source: 'CUSTOM'; readonly draft: CustomIconDraft }
);

function readPick(item: unknown): ReadPick | null {
  if (!isRecord(item)) return null;
  if (item['source'] === 'CATALOGUE') {
    const id = item['id'];
    const entry = typeof id === 'string' ? iconCatalogueEntry(id) : undefined;
    if (entry === undefined) return null;
    return {
      source: 'CATALOGUE',
      pick: { source: 'CATALOGUE', id: entry.id },
      count: iconComponentCount(entry),
    };
  }
  if (item['source'] !== 'CUSTOM') return null;
  const draft = readDraft(item['entry']);
  if (draft === null) return null;
  return {
    source: 'CUSTOM',
    draft,
    count: iconComponentCount(draft.states === null ? {} : { states: draft.states }),
  };
}

/** A stored custom entry's fields, each of the type it must be, or `null` where one is not. */
function readDraft(value: unknown): CustomIconDraft | null {
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

/** The custom entry a stored draft makes on the roster read so far, or `null` where the check refuses it. */
function customPick(draft: CustomIconDraft, picks: readonly IconPick[]): IconPick | null {
  const { entry } = checkCustomIcon(draft, picks, null);
  return entry === null ? null : { source: 'CUSTOM', entry };
}
