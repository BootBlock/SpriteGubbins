import { describe, expect, it } from 'vitest';
import { iconPickId } from '../../utils/iconPickId.ts';
import { sortIconPicks } from '../../utils/sortIconPicks.ts';
import { CATEGORY_OPTIONS } from '../categories/index.ts';
import { PRESETS } from './index.ts';

/**
 * That every roster the app declares is already in shelving order, each icon once (B2 and B6 of
 * `docs/todo/icon-set-audit.md`).
 *
 * The store writes every roster through `sortIconPicks` and the parser sorts every roster it reads, so a
 * declaration out of that order is the one way a roster can reach the studio unsorted. The first tick
 * then sorts it, which moves icons the reader never touched onto other sheets and drops the progress
 * tick of a sheet already drawn. A repeated id would print the icon twice until that tick. **Held over
 * the registry**, so a preset added later is covered without being named here.
 */
const STARTER = CATEGORY_OPTIONS.ICON.iconRoster?.picks;
// Thrown rather than defaulted: an empty stand-in would pass the shelving check below with nothing in it.
if (STARTER === undefined || STARTER.length === 0) throw new Error('ICON should declare a starter roster.');

const DECLARED = [
  { name: 'ICON’s starter roster', picks: STARTER },
  ...PRESETS.flatMap((preset) =>
    preset.subject.icons === undefined ? [] : [{ name: preset.id, picks: preset.subject.icons.picks }],
  ),
];

describe('declared icon rosters', () => {
  it('include the starter roster and every ICON preset', () => {
    expect(DECLARED.map(({ name }) => name)).toContain('fantasy-inventory-icon-grid');
    expect(DECLARED.length).toBe(1 + PRESETS.filter((preset) => preset.category === 'ICON').length);
  });

  it.each(DECLARED)('$name is declared in shelving order, each icon once', ({ picks }) => {
    expect(picks.map(iconPickId)).toEqual(sortIconPicks(picks).map(iconPickId));
  });
});
