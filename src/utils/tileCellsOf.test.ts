import { describe, expect, it } from 'vitest';
import { iconOverlaySheets } from '../constants/sheetPlans/iconOverlaySheets.ts';
import { ICON_LOOKS } from '../types/iconRoster.ts';
import { planSlots } from './componentSlots.ts';
import { tileCellsOf } from './tileCellsOf.ts';

describe('tileCellsOf', () => {
  it.each(ICON_LOOKS)('measures the tile from the veil alone under %s', (look) => {
    // A halo or a glow drawn round the square's edge reaches past it by its glow, so only the veil's
    // box is the square.
    const [sheet] = iconOverlaySheets(look, []);
    const slots = planSlots(sheet);
    expect(tileCellsOf(sheet).measuring.map((cell) => slots[cell])).toEqual(['disabled-veil']);
  });

  it.each(ICON_LOOKS)('places every piece drawn to the whole tile against its own box under %s', (look) => {
    // The quarter sweep fills one quadrant, so it keeps its place; the three-quarter sweep reaches
    // every edge of the square.
    const [sheet] = iconOverlaySheets(look, []);
    const slots = planSlots(sheet);
    expect(tileCellsOf(sheet).spanning.map((cell) => slots[cell])).toEqual([
      'disabled-veil',
      'highlight-halo',
      'selected-ring',
      'cooldown-sweep-three-quarters',
      'rarity-glow',
    ]);
  });
});
