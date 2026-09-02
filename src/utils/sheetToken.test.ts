import { describe, expect, it } from 'vitest';
import type { ManifestSheet } from '../types/spriteManifest.ts';
import { sheetToken } from './sheetToken.ts';

/** A sheet of a ten-generation batch — the eight-compass character the tab is written for. */
function sheet(ordinal: number, total = 10): ManifestSheet {
  return {
    category: 'CHARACTER',
    plan: 'Directional core — cardinal facings',
    ordinal,
    total,
    facings: ['south', 'west', 'north', 'east'],
    assembly: 'south',
    components: 15,
    rigMode: 'CUTOUT_RIG',
  };
}

describe('sheetToken', () => {
  it('takes the facing where one names the sheet', () => {
    // Preferred to the ordinal because it is the word an engine importer's tree is keyed by.
    expect(sheetToken('south-west', sheet(4))).toBe('south-west');
  });

  it('falls back to the ordinal where no facing names the sheet', () => {
    // The two directional cores of an eight-compass batch draw four facings each, so neither is
    // named by one — and until they took the ordinal, both packs carried the same entry names.
    expect(sheetToken(null, sheet(1))).toBe('sheet-1');
    expect(sheetToken(null, sheet(2))).toBe('sheet-2');
  });

  it('names nothing where the batch holds one sheet, and there is nothing to tell apart', () => {
    // A tileset, or a studio composing a single sheet: `sheet-1` would assert a series that is not
    // there. `null` where the studio states no sheet at all, for the same reason.
    expect(sheetToken(null, sheet(1, 1))).toBeNull();
    expect(sheetToken(null, null)).toBeNull();
  });
});
