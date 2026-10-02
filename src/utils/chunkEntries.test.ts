import { describe, expect, it } from 'vitest';
import {
  ICON_ROSTER_CAPACITY,
  ICON_SERIES_LONGEST,
  ICONS_PER_SHEET,
} from '../constants/iconCatalogue/iconSheetLimits.ts';
import type { ComponentEntry } from '../types/components.ts';
import { chunkEntries } from './chunkEntries.ts';
import { componentTotal } from './componentTotal.ts';

/** A one-component line, named for its position. */
function single(at: number): ComponentEntry {
  return { label: `icon-${String(at)}`, text: `Icon ${String(at)} ×1`, count: 1, kind: 'structure' };
}

/** A two-component line, as a two-state catalogue entry becomes. */
function pair(at: number): ComponentEntry {
  return {
    label: `toggle-${String(at)}`,
    parts: [`toggle-${String(at)}-on`, `toggle-${String(at)}-off`],
    text: `Toggle ${String(at)} ×2`,
    count: 2,
    kind: 'structure',
  };
}

function singles(count: number, from = 0): ComponentEntry[] {
  return Array.from({ length: count }, (_, index) => single(from + index));
}

describe('chunkEntries', () => {
  it('cuts a run at the capacity and keeps the order', () => {
    const runs = chunkEntries(singles(33), ICONS_PER_SHEET);
    expect(runs.map(componentTotal)).toEqual([16, 16, 1]);
    expect(runs.flat().map((entry) => entry.label)).toEqual(singles(33).map((entry) => entry.label));
  });

  it('closes a run early rather than split a pair across two sheets', () => {
    const runs = chunkEntries([...singles(15), pair(15), ...singles(3, 16)], ICONS_PER_SHEET);
    expect(runs.map(componentTotal)).toEqual([15, 5]);
    expect(runs[1]?.[0]?.label).toBe('toggle-15');
  });

  it('fills a run exactly where a pair lands on the boundary', () => {
    const runs = chunkEntries([...singles(14), pair(14), single(15)], ICONS_PER_SHEET);
    expect(runs.map(componentTotal)).toEqual([16, 1]);
  });

  it('returns no run for no lines', () => {
    expect(chunkEntries([], ICONS_PER_SHEET)).toEqual([]);
  });

  it('stays inside the bound the stored sheet index is derived from, on the worst roster there is', () => {
    // Fifteen singles and then a pair, over and over: every sheet closes at fifteen, which is the case
    // `ICON_SERIES_LONGEST` is derived for. Built to the roster's whole capacity.
    const entries: ComponentEntry[] = [];
    let filled = 0;
    for (let at = 0; filled < ICON_ROSTER_CAPACITY; at += 1) {
      const next = at % 16 === 15 ? pair(at) : single(at);
      if (filled + next.count > ICON_ROSTER_CAPACITY) break;
      entries.push(next);
      filled += next.count;
    }
    const runs = chunkEntries(entries, ICONS_PER_SHEET);
    expect(runs.length + 1).toBeLessThanOrEqual(ICON_SERIES_LONGEST);
    expect(runs.slice(0, -1).every((run) => componentTotal(run) >= ICONS_PER_SHEET - 1)).toBe(true);
  });
});
