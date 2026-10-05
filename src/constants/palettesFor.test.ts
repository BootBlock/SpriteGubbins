import { describe, expect, it } from 'vitest';
import { tintMaskedIconSubject } from '../test/tintMaskedIconSubject.ts';
import { PALETTE_IDS } from '../types/palette.ts';
import { defaultSubjectFor } from './categories/index.ts';
import { palettesFor, resolvePalette } from './palettesFor.ts';
import { paletteWithdrawal } from './paletteWithdrawal.ts';

/**
 * The palettes a subject can be drawn under (audit finding M1). A tint mask is drawn in neutral greys,
 * which no pinned palette's hues can state, so it takes `FREE` alone and every other subject takes all.
 */
describe('palettesFor', () => {
  it('offers a tint mask nothing but FREE, and moves any stored palette onto it', () => {
    const mask = tintMaskedIconSubject();
    expect(palettesFor(mask)).toEqual(['FREE']);
    for (const palette of PALETTE_IDS) expect(resolvePalette(mask, palette)).toBe('FREE');
    expect(paletteWithdrawal(mask)).toContain('no fixed palette is offered');
  });

  it('offers a full-colour icon set and every other subject every palette, and says nothing', () => {
    for (const subject of [defaultSubjectFor('ICON'), defaultSubjectFor('CHARACTER')]) {
      expect(palettesFor(subject)).toEqual(PALETTE_IDS);
      expect(resolvePalette(subject, 'GAME_BOY_DMG')).toBe('GAME_BOY_DMG');
      expect(paletteWithdrawal(subject)).toBe('');
    }
  });
});
