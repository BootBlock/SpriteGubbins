import { describe, expect, it } from 'vitest';
import { ICON_ROSTER_CAPACITY, ICONS_PER_SHEET } from '../constants/iconCatalogue/iconSheetLimits.ts';
import type { ComponentEntry } from '../types/components.ts';
import { balancedChunks } from './balancedChunks.ts';
import { chunkEntries } from './chunkEntries.ts';
import { componentTotal } from './componentTotal.ts';

/**
 * That a roster is cut into as few sheets as `chunkEntries` cuts it into, and as evenly as its lines
 * allow (audit finding T5): a last sheet of two icons beside a sheet of sixteen drew them twice as large.
 */
function line(at: number, count: 1 | 2): ComponentEntry {
  return {
    label: `icon-${String(at)}`,
    text: `Icon ${String(at)} ×${String(count)}`,
    count,
    kind: 'structure',
  };
}

function singles(count: number): ComponentEntry[] {
  return Array.from({ length: count }, (_, index) => line(index, 1));
}

/** A deterministic mix of singles and two-state pairs, so the property below is repeatable. */
function mixed(seed: number, total: number): ComponentEntry[] {
  const lines: ComponentEntry[] = [];
  let filled = 0;
  let state = seed;
  while (filled < total) {
    state = (state * 1103515245 + 12345) % 2147483648;
    const count = state % 5 === 0 && filled + 2 <= total ? 2 : 1;
    lines.push(line(lines.length, count));
    filled += count;
  }
  return lines;
}

describe('balancedChunks', () => {
  it('cuts eighteen icons into two sheets of nine, not sixteen and two', () => {
    expect(balancedChunks(singles(18), ICONS_PER_SHEET).map(componentTotal)).toEqual([9, 9]);
    expect(balancedChunks(singles(17), ICONS_PER_SHEET).map(componentTotal)).toEqual([9, 8]);
    expect(balancedChunks(singles(33), ICONS_PER_SHEET).map(componentTotal)).toEqual([11, 11, 11]);
  });

  it('leaves a roster that fits one sheet whole', () => {
    expect(balancedChunks(singles(16), ICONS_PER_SHEET).map(componentTotal)).toEqual([16]);
    expect(balancedChunks([], ICONS_PER_SHEET)).toEqual([]);
  });

  it.each([3, 17, 40, 97, 160, 241, ICON_ROSTER_CAPACITY])(
    'keeps the order, the sheet count and the capacity, and the sheets within two of each other, for %i',
    (total) => {
      for (const seed of [1, 7, 42]) {
        const lines = mixed(seed, total);
        const runs = balancedChunks(lines, ICONS_PER_SHEET);
        const sizes = runs.map(componentTotal);
        expect(runs.flat()).toEqual(lines);
        expect(runs).toHaveLength(chunkEntries(lines, ICONS_PER_SHEET).length);
        expect(Math.max(...sizes)).toBeLessThanOrEqual(ICONS_PER_SHEET);
        expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(2);
      }
    },
  );
});
