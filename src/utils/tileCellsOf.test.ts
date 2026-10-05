import { describe, expect, it } from 'vitest';
import { iconOverlaySheets } from '../constants/sheetPlans/iconOverlaySheets.ts';
import { ICON_LOOKS } from '../types/iconRoster.ts';
import { planSlots } from './componentSlots.ts';
import { tileCellsOf } from './tileCellsOf.ts';

describe('tileCellsOf', () => {
  it.each(ICON_LOOKS)(
    'finds the veil and the halo alone under %s, and never the ring or the sweep',
    (look) => {
      // A ring stands inside the square's edge and a sweep fills a quadrant of it, so a square measured
      // from either is not the tile square.
      const [sheet] = iconOverlaySheets(look, []);
      const slots = planSlots(sheet);
      const cells = tileCellsOf(sheet);
      expect(cells.map((cell) => slots[cell])).toEqual(['disabled-veil', 'highlight-halo']);
    },
  );
});
