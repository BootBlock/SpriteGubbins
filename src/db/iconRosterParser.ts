import { iconCatalogueEntry, iconComponentCount } from '../constants/iconCatalogue/index.ts';
import { ICON_ROSTER_CAPACITY } from '../constants/iconCatalogue/iconSheetLimits.ts';
import type { CustomIconDraft } from '../types/customIconDraft.ts';
import { ICON_COLOUR_MODES, ICON_LOOKS } from '../types/iconRoster.ts';
import type { IconPick, IconRoster } from '../types/iconRoster.ts';
import { checkCustomIcon } from '../utils/checkCustomIcon.ts';
import { iconPickId } from '../utils/iconPickId.ts';
import { sortIconPicks } from '../utils/sortIconPicks.ts';
import { readCustomIconDraft } from './customIconEntryParser.ts';
import { isRecord, pick } from './readers.ts';

/**
 * A stored icon roster, read back against the catalogue this build ships.
 *
 * **Tolerant field by field, as `parseSubject` is.** A roster that is not a record, or whose picks are
 * not a list, has been damaged or edited by hand, and the category's starter roster (`fallback`) stands
 * in for that part. A look or a colour mode this build does not draw falls back to the starter's, which
 * is also how a roster stored before the colour mode existed reads: as a set in the starter's colours.
 *
 * **A pick that does not parse is dropped**, which is what the project's no-compatibility rule asks of a
 * retired identifier or shape: it is not translated, and the set loses that one icon rather than gaining
 * a blank slot. That covers a catalogue id this build does not hold, a pick written before picks were
 * tagged (a bare id string), and an entry of the reader's own that `checkCustomIcon` refuses — so a
 * hand-edited entry carrying `[SEC:…]` never reaches the compiler, whose citations it would break. A
 * custom entry's slot name is derived again from its role rather than trusted from storage.
 *
 * **Each pick is read as the store would add it, in the order it was stored**: a repeat or an entry
 * whose slot name is taken is skipped, and so is a pick the set has no room left for under
 * `ICON_ROSTER_CAPACITY` components, as a tick past capacity is refused (`toggleIconPicks`) and a
 * custom entry is (`checkCustomIcon`). A repeat is skipped before the room is measured, so it never
 * costs the set a pick after it. No stored roster can ask for a series past the bound
 * `SHEET_INDEX_RANGE` is derived from.
 *
 * **The roster comes back in shelving order** (`sortIconPicks`), whatever order storage holds it in.
 * The store writes every roster in that order, so one it wrote reads back unchanged; one edited by hand
 * or imported out of order is sorted here, at the boundary, rather than by the reader's first tick,
 * which would move icons they never touched onto other sheets.
 */
export function parseIconRoster(value: unknown, fallback: IconRoster): IconRoster {
  if (!isRecord(value)) return fallback;
  const look = pick(value, 'look', fallback.look, ICON_LOOKS);
  const colourMode = pick(value, 'colourMode', fallback.colourMode, ICON_COLOUR_MODES);
  const stored = value['picks'];
  if (!Array.isArray(stored)) return { look, colourMode, picks: fallback.picks };

  const picks: IconPick[] = [];
  let filled = 0;
  for (const item of stored) {
    const read = readPick(item);
    if (read === null) continue;
    const parsed = read.source === 'CATALOGUE' ? read.pick : customPick(read.draft, picks);
    if (parsed === null || picks.some((held) => iconPickId(held) === iconPickId(parsed))) continue;
    if (filled + read.count > ICON_ROSTER_CAPACITY) continue;
    picks.push(parsed);
    filled += read.count;
  }
  return { look, colourMode, picks: sortIconPicks(picks) };
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
  const draft = readCustomIconDraft(item['entry']);
  if (draft === null) return null;
  return {
    source: 'CUSTOM',
    draft,
    count: iconComponentCount(draft.states === null ? {} : { states: draft.states }),
  };
}

/** The custom entry a stored draft makes on the roster read so far, or `null` where the check refuses it. */
function customPick(draft: CustomIconDraft, picks: readonly IconPick[]): IconPick | null {
  const { entry } = checkCustomIcon(draft, picks, null, []);
  return entry === null ? null : { source: 'CUSTOM', entry };
}
