import { iconCatalogueEntry } from '../constants/iconCatalogue/index.ts';
import { ICON_ROSTER_CAPACITY } from '../constants/iconCatalogue/iconSheetLimits.ts';
import { ICON_LOOKS } from '../types/iconRoster.ts';
import type { IconRoster } from '../types/iconRoster.ts';
import { isRecord, pick } from './readers.ts';

/**
 * A stored icon roster, read back against the catalogue this build ships.
 *
 * **Tolerant field by field, as `parseSubject` is.** A roster that is not a record, or whose picks are
 * not a list, has been damaged or edited by hand, and the category's starter roster (`fallback`) stands
 * in for that part. A look this build does not draw falls back to the starter's.
 *
 * **A pick the catalogue no longer holds is dropped**, which is what the project's no-compatibility
 * rule asks of a retired identifier: it is not translated, and the set loses that one icon rather than
 * gaining a blank slot. Repeats keep their first position, and the list stops at the last pick that fits
 * in `ICON_ROSTER_CAPACITY` components, so no stored roster can ask for a series past the bound
 * `SHEET_INDEX_RANGE` is derived from.
 */
export function parseIconRoster(value: unknown, fallback: IconRoster): IconRoster {
  if (!isRecord(value)) return fallback;
  const look = pick(value, 'look', fallback.look, ICON_LOOKS);
  const stored = value['picks'];
  if (!Array.isArray(stored)) return { look, picks: fallback.picks };

  const picks: string[] = [];
  let filled = 0;
  for (const id of stored) {
    if (typeof id !== 'string' || picks.includes(id)) continue;
    const entry = iconCatalogueEntry(id);
    if (entry === undefined) continue;
    const count = entry.states === undefined ? 1 : 2;
    if (filled + count > ICON_ROSTER_CAPACITY) break;
    picks.push(id);
    filled += count;
  }
  return { look, picks };
}
